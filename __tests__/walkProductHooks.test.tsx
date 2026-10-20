import React from 'react';
import { AppState } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { appQueryClient } from '../src/services/query/appQueryClient';
import {
  useWalkProgression,
  useWalkScope,
  useWalkSources,
} from '../src/hooks/useWalkProduct';
import { useAuthStore } from '../src/store/authStore';
import { usePetStore } from '../src/store/petStore';
import { walkProgressionRepository } from '../src/services/walk/server/supabaseWalkProgressionRepository';
import { walkRecordRepository } from '../src/services/walk/server/supabaseWalkRecordRepository';
import {
  WalkProgressionRow,
  WalkHomeFooter,
} from '../src/components/records/WalkProductSummary';
import {
  getProgressionSnapshot,
  toProgressionWire,
} from '../src/services/walk/domain';
import type { PetWalkProgression } from '../src/services/walk/server/progressionRepository';
import WalkHistoryScreen from '../src/screens/Records/WalkHistoryScreen';
import WalkResultIntegration from '../src/components/records/WalkResultIntegration';
import { useGpsWalkComposer } from '../src/hooks/useGpsWalkComposer';
import type { WalkDraftFields } from '../src/services/walk/product/drafts';
import {
  loadWalkDraft,
  prepareWalkSubmission,
} from '../src/services/walk/product/drafts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRecordStore } from '../src/store/recordStore';
import type {
  WalkRecordReference,
  WalkRecordView,
} from '../src/services/walk/server/recordRepository';

jest.mock('../src/store/authStore', () => ({
  useAuthStore: jest.requireActual('zustand').create(() => ({ session: null })),
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: jest
    .requireActual('zustand')
    .create(() => ({ pets: [], selectedPetId: null })),
  resolveSelectedPetId: (pets: { id: string }[], selected: string | null) =>
    pets.find(p => p.id === selected)?.id ?? pets[0]?.id ?? null,
}));
jest.mock(
  '../src/services/walk/server/supabaseWalkProgressionRepository',
  () => ({ walkProgressionRepository: { get: jest.fn() } }),
);
jest.mock('../src/services/walk/server/supabaseWalkRecordRepository', () => ({
  walkRecordRepository: {
    memorySummaries: jest.fn(),
    prompt: jest.fn(),
    dismiss: jest.fn(),
    history: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../src/services/local/uploadQueue', () => ({
  enqueuePendingMemoryUpload: jest.fn(),
  processPendingMemoryUploads: jest.fn(),
}));
jest.mock('../src/components/common/SeasonalFormSurface', () => ({
  SeasonalFormBackground: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 18 }),
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { petId: 'pet-a' } }),
  useIsFocused: () => true,
}));
const auth = useAuthStore as unknown as {
  setState: (s: {
    session: { user: { id: string }; token?: string } | null;
  }) => void;
};
const pets = usePetStore as unknown as {
  setState: (s: {
    pets?: { id: string; theme?: string }[];
    selectedPetId?: string;
  }) => void;
};
const progression = (petId: string, m = 0n): PetWalkProgression => ({
  ...toProgressionWire(getProgressionSnapshot(m)),
  petId,
  eligibleSessionCount: m ? '1' : '0',
  milestones: [],
});
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
};
let tree: Renderer.ReactTestRenderer | undefined;
const flush = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};
const mount = async (child: React.ReactElement) => {
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={appQueryClient}>
        <ThemeProvider theme={createTheme('light')}>{child}</ThemeProvider>
      </QueryClientProvider>,
    );
  });
  await flush();
};
const texts = () =>
  tree!.root
    .findAll(n => n.type === ('AppText' as unknown))
    .flatMap(n => React.Children.toArray(n.props.children))
    .join(' ')
    .replace(/\s+/g, ' ');
let latest: ReturnType<typeof useWalkProgression>;
function Read({ petId = 'pet-a' }: { petId?: string }) {
  latest = useWalkProgression(petId);
  return null;
}
beforeEach(() => {
  jest.clearAllMocks();
  appQueryClient.clear();
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    value: 'active',
    writable: true,
  });
  auth.setState({
    session: { user: { id: 'owner-a' }, token: 'synthetic-one' },
  });
  pets.setState({
    pets: [{ id: 'pet-a' }, { id: 'pet-b' }],
    selectedPetId: 'pet-a',
  });
  jest
    .mocked(walkProgressionRepository.get)
    .mockImplementation(async pet => progression(pet));
});
afterEach(async () => {
  await act(async () => {
    tree?.unmount();
  });
  tree = undefined;
  appQueryClient.clear();
});
it('same-owner token refresh and unrelated pet edits do not reject or duplicate an in-flight read', async () => {
  const d = deferred<PetWalkProgression>();
  jest.mocked(walkProgressionRepository.get).mockReturnValue(d.promise);
  await mount(<Read />);
  await act(async () => {
    auth.setState({
      session: { user: { id: 'owner-a' }, token: 'synthetic-refreshed' },
    });
    pets.setState({ pets: [{ id: 'pet-a', theme: 'new' }, { id: 'pet-b' }] });
    d.resolve(progression('pet-a', 1200n));
  });
  await flush();
  expect(latest.data?.lifetimeDistanceM).toBe('1200');
  expect(latest.isError).toBe(false);
  expect(walkProgressionRepository.get).toHaveBeenCalledTimes(1);
});
it('selected A→B→A rejects the old completion and automatically starts a usable fresh A query', async () => {
  const old = deferred<PetWalkProgression>();
  jest
    .mocked(walkProgressionRepository.get)
    .mockReturnValueOnce(old.promise)
    .mockImplementation(async pet => progression(pet, 2500n));
  await mount(<Read />);
  await act(async () => pets.setState({ selectedPetId: 'pet-b' }));
  await act(async () => pets.setState({ selectedPetId: 'pet-a' }));
  await flush();
  await act(async () => old.resolve(progression('pet-a', 999n)));
  await flush();
  expect(latest.data?.lifetimeDistanceM).toBe('2500');
  expect(walkProgressionRepository.get).toHaveBeenCalledTimes(2);
});
it('pinned record projection uses captured memory→pet map while global selection changes', async () => {
  const d =
    deferred<
      Awaited<ReturnType<typeof walkRecordRepository.memorySummaries>>
    >();
  jest.mocked(walkRecordRepository.memorySummaries).mockReturnValue(d.promise);
  let current = false;
  function Sources() {
    const s = useWalkScope('pet-a', 'PINNED');
    const q = useWalkSources('pet-a', ['memory-a']);
    current = !!s?.current();
    return <React.Fragment>{q.data?.length}</React.Fragment>;
  }
  await mount(<Sources />);
  await act(async () => {
    pets.setState({ selectedPetId: 'pet-b' });
    d.resolve([]);
  });
  await flush();
  expect(current).toBe(true);
  expect(walkRecordRepository.memorySummaries).toHaveBeenCalledTimes(1);
  expect(walkRecordRepository.memorySummaries).toHaveBeenCalledWith([
    { memoryId: 'memory-a', petId: 'pet-a' },
  ]);
});
it('Home deferred disabled read is nonblocking; loading/error never fabricate zero, confirmed zero is Lv1', async () => {
  await mount(<WalkProgressionRow petId="pet-a" enabled={false} />);
  expect(walkProgressionRepository.get).not.toHaveBeenCalled();
  expect(texts()).not.toContain('0 m');
  const d = deferred<PetWalkProgression>();
  jest.mocked(walkProgressionRepository.get).mockReturnValue(d.promise);
  await act(async () =>
    tree!.update(
      <QueryClientProvider client={appQueryClient}>
        <ThemeProvider theme={createTheme('light')}>
          <WalkProgressionRow petId="pet-a" enabled />
        </ThemeProvider>
      </QueryClientProvider>,
    ),
  );
  expect(texts()).toContain('불러오는');
  expect(texts()).not.toContain('0 m');
  await act(async () => d.resolve(progression('pet-a')));
  await flush();
  expect(texts()).toContain('0 m');
  expect(texts()).toContain('Lv. 1');
});
it('Home and lazy profile reuse a single progression query', async () => {
  await mount(
    <>
      <WalkProgressionRow petId="pet-a" enabled />
      <WalkProgressionRow petId="pet-a" enabled expanded />
    </>,
  );
  expect(walkProgressionRepository.get).toHaveBeenCalledTimes(1);
  expect(texts()).toContain('다음 레벨까지');
});
it('history consumes server cursor, opens original detail, and leaves deleted records non-actionable', async () => {
  const summary = {
    sessionId: 'server',
    startedAt: '2026-10-19T00:00:00.000Z',
    endedAt: '2026-10-19T00:20:00.000Z',
    acceptedAt: '2026-10-19T00:21:00.000Z',
    measuredDurationMs: '1200000',
    activeDurationMs: '1200000',
    measuredDistanceM: '1200',
    acceptedDistanceM: '1200',
    eligibility: 'PROGRESSION_ELIGIBLE' as const,
  };
  const pending: WalkRecordReference = {
    version: 1,
    source: 'GPS_TRACKED',
    petId: 'pet-a',
    clientSessionId: 'pending',
    sessionDeleted: false,
    summary,
    recordState: 'RECORD_PENDING',
    originalMemoryId: null,
  };
  const cursor = {
    version: 1 as const,
    petId: 'pet-a',
    pageSize: 30,
    acceptedAt: '2026-10-19T00:21:00.123456Z',
    clientSessionId: 'cursor',
  };
  jest
    .mocked(walkRecordRepository.history)
    .mockResolvedValueOnce({
      items: [pending],
      hasMore: true,
      nextCursor: cursor,
    })
    .mockResolvedValueOnce({
      items: [
        {
          ...pending,
          clientSessionId: 'recorded',
          recordState: 'RECORDED',
          originalMemoryId: 'original',
        },
        {
          ...pending,
          clientSessionId: 'deleted',
          recordState: 'RECORD_DELETED',
          originalMemoryId: 'deleted-memory',
        },
      ],
      hasMore: false,
      nextCursor: null,
    });
  await mount(<WalkHistoryScreen />);
  act(() =>
    tree!.root
      .findAllByProps({ testID: 'walk-history-RECORD_PENDING' })[0]
      .props.onPress(),
  );
  expect(mockNavigation.navigate).toHaveBeenCalledWith(
    'RecordCreate',
    expect.objectContaining({
      petId: 'pet-a',
      gpsSession: { clientSessionId: 'pending' },
    }),
  );
  const more = tree!.root
    .findAll(
      n =>
        n.props.onPress &&
        n.findAll(
          c =>
            c.type === ('AppText' as unknown) &&
            c.props.children === '이전 산책 더 보기',
        ).length > 0,
    )
    .at(-1)!;
  await act(async () => more.props.onPress());
  await flush();
  expect(walkRecordRepository.history).toHaveBeenLastCalledWith(
    'pet-a',
    30,
    cursor,
  );
  act(() =>
    tree!.root
      .findAllByProps({ testID: 'walk-history-RECORDED' })[0]
      .props.onPress(),
  );
  expect(mockNavigation.navigate).toHaveBeenLastCalledWith(
    'AppTabs',
    expect.objectContaining({
      params: {
        screen: 'RecordDetail',
        params: { petId: 'pet-a', memoryId: 'original' },
      },
    }),
  );
  expect(
    tree!.root.findAllByProps({ testID: 'walk-history-RECORD_DELETED' })[0]
      .props.disabled,
  ).toBe(true);
});
it('result pending/rejected makes no accepted-data request and no reward action; accepted exposes canonical record entry', async () => {
  await mount(
    <WalkResultIntegration
      petId="pet-a"
      clientSessionId="session"
      state="SYNC_PENDING"
    />,
  );
  expect(texts()).toContain('연결되면');
  expect(walkRecordRepository.get).not.toHaveBeenCalled();
  expect(walkProgressionRepository.get).not.toHaveBeenCalled();
  await act(async () =>
    tree!.update(
      <QueryClientProvider client={appQueryClient}>
        <ThemeProvider theme={createTheme('light')}>
          <WalkResultIntegration
            petId="pet-a"
            clientSessionId="session"
            state="REJECTED_SERVER"
          />
        </ThemeProvider>
      </QueryClientProvider>,
    ),
  );
  expect(texts()).toContain('적립되지');
  expect(walkRecordRepository.get).not.toHaveBeenCalled();
  jest
    .mocked(walkRecordRepository.get)
    .mockResolvedValue({ recordState: 'RECORD_PENDING' } as WalkRecordView);
  await act(async () =>
    tree!.update(
      <QueryClientProvider client={appQueryClient}>
        <ThemeProvider theme={createTheme('light')}>
          <WalkResultIntegration
            petId="pet-a"
            clientSessionId="session"
            state="ACCEPTED_SERVER"
          />
        </ThemeProvider>
      </QueryClientProvider>,
    ),
  );
  await flush();
  expect(texts()).toContain('산책 기록으로 남기기');
  expect(texts()).not.toContain('XP');
});
it('real GPS composer hook preserves unknown/replayed edited draft and upserts canonical original', async () => {
  const ownerId = '11111111-1111-4111-8111-111111111111',
    petId = '22222222-2222-4222-8222-222222222222',
    clientSessionId = '33333333-3333-4333-8333-333333333333';
  auth.setState({ session: { user: { id: ownerId } } });
  pets.setState({ pets: [{ id: petId }], selectedPetId: petId });
  const db = new Map<string, string>();
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async k => db.get(k) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (k, v) => {
    db.set(k, v);
  });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async k => {
    db.delete(k);
  });
  const fields: WalkDraftFields = {
    title: '기기 초안',
    content: '원래 내용',
    tags: [],
    emotion: null,
    photos: [
      { key: 'photo', uri: 'file:///synthetic.jpg', mimeType: 'image/jpeg' },
    ],
  };
  const draftScope = { ownerId, petId, clientSessionId },
    candidate = '44444444-4444-4444-8444-444444444444';
  await prepareWalkSubmission(draftScope, fields, () => candidate);
  const record: WalkRecordView = {
    version: 1,
    source: 'GPS_TRACKED',
    petId,
    clientSessionId,
    sessionDeleted: false,
    recordState: 'RECORD_PENDING',
    memory: null,
    claim: null,
    summary: {
      sessionId: candidate,
      startedAt: '2026-10-19T00:00:00.000Z',
      endedAt: '2026-10-19T00:20:00.000Z',
      acceptedAt: '2026-10-19T00:21:00.000Z',
      measuredDurationMs: '1200000',
      activeDurationMs: '1200000',
      measuredDistanceM: '1200',
      acceptedDistanceM: '1200',
      eligibility: 'PROGRESSION_ELIGIBLE',
    },
  };
  jest.mocked(walkRecordRepository.get).mockResolvedValue(record);
  const original = {
    ...record,
    recordState: 'RECORDED' as const,
    memory: {
      id: '55555555-5555-4555-8555-555555555555',
      petId,
      title: '서버 원본 제목',
      content: '서버 원본 내용',
      emotion: null,
      tags: [],
      category: 'walk' as const,
      occurredAt: '2026-10-19',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z',
      imagePath: null,
      imagePaths: [],
    },
  };
  jest
    .mocked(walkRecordRepository.create)
    .mockRejectedValueOnce(new Error('unknown'))
    .mockResolvedValueOnce({
      record: original,
      replayed: true,
      reward: null,
      activity: null,
    });
  let gps!: ReturnType<typeof useGpsWalkComposer>,
    edit!: (next: WalkDraftFields) => void;
  function Gps() {
    const [value, setValue] = React.useState(fields);
    edit = setValue;
    const hydrate = React.useCallback((f: WalkDraftFields) => setValue(f), []);
    gps = useGpsWalkComposer(clientSessionId, petId, value, hydrate);
    return null;
  }
  const upsert = jest.spyOn(useRecordStore.getState(), 'upsertOneLocal');
  await mount(<Gps />);
  expect(gps.ready).toBe(true);
  await act(async () => {
    await expect(gps.submit()).rejects.toThrow('unknown');
  });
  await act(async () => edit({ ...fields, content: '수정한 초안' }));
  await act(async () => {
    const result = await gps.submit();
    expect(result?.retained).toBe(true);
  });
  expect(upsert).toHaveBeenLastCalledWith(
    petId,
    expect.objectContaining({
      id: original.memory.id,
      title: '서버 원본 제목',
    }),
  );
  expect((await loadWalkDraft(draftScope))?.fields.content).toBe('수정한 초안');
  expect(walkRecordRepository.create).toHaveBeenLastCalledWith(
    expect.objectContaining({
      record: expect.objectContaining({ content: '원래 내용' }),
    }),
  );
  upsert.mockRestore();
});
it('dismiss(A) followed by selection B leaves B controls usable and no stale A error', async () => {
  const pending = deferred<void>();
  const summary = {
    sessionId: 'server',
    startedAt: '2026-10-19T00:00:00.000Z',
    endedAt: '2026-10-19T00:20:00.000Z',
    acceptedAt: '2026-10-19T00:21:00.000Z',
    measuredDurationMs: '1200000',
    activeDurationMs: '1200000',
    measuredDistanceM: '1200',
    acceptedDistanceM: '1200',
    eligibility: 'PROGRESSION_ELIGIBLE' as const,
  };
  jest
    .mocked(walkRecordRepository.prompt)
    .mockImplementation(async petId => ({
      version: 1,
      source: 'GPS_TRACKED',
      petId,
      clientSessionId: `session-${petId}`,
      sessionDeleted: false,
      summary,
      recordState: 'RECORD_PENDING',
      originalMemoryId: null,
    }));
  jest.mocked(walkRecordRepository.dismiss).mockReturnValue(pending.promise);
  await mount(<WalkHomeFooter petId="pet-a" enabled />);
  act(() =>
    tree!.root
      .findAllByProps({ accessibilityLabel: '산책 기록 안내 닫기' })[0]
      .props.onPress(),
  );
  await act(async () => {
    pets.setState({ selectedPetId: 'pet-b' });
    tree!.update(
      <QueryClientProvider client={appQueryClient}>
        <ThemeProvider theme={createTheme('light')}>
          <WalkHomeFooter petId="pet-b" enabled />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
  await flush();
  await act(async () => pending.resolve());
  await flush();
  expect(
    tree!.root.findAllByProps({ accessibilityLabel: '산책 기록 안내 닫기' })[0]
      .props.disabled,
  ).toBe(false);
  expect(texts()).not.toContain('로그인 상태');
  expect(texts()).not.toContain('다시 시도');
});
