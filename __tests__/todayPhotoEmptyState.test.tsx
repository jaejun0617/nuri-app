import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import {
  pickTodayPhoto,
  type TodayPhotoPickResult,
} from '../src/services/home/homeRecall';
import type { MemoryRecord } from '../src/services/supabase/memories';
import type { PetRecordsState } from '../src/store/recordStore';
import { TodayPhotoSection } from '../src/screens/Main/components/LoggedInHome/TodayPhotoSection';

jest.mock('../src/services/home/homeRecall', () => ({
  pickTodayPhoto: jest.fn(),
}));
jest.mock('../src/hooks/useSignedMemoryImage', () => ({
  useSignedMemoryImage: () => ({
    signedUrl: 'https://example.test/photo.jpg',
    loading: false,
    resolved: true,
  }),
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/providers/AppFontPreferenceProvider', () => ({
  FixedTypographyBoundary: ({ children }: { children: React.ReactNode }) =>
    children,
}));

const pick = jest.mocked(pickTodayPhoto);
const emptyRecords: MemoryRecord[] = [];
const photo: MemoryRecord = {
  id: 'real-photo-record',
  petId: 'pet-a',
  title: '실제 사진 기록',
  tags: [],
  imagePaths: ['pet-a/photo.jpg'],
  category: 'diary',
  createdAt: '2026-10-01T00:00:00Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('Today photo confirmed-empty contract', () => {
  beforeEach(() => pick.mockReset());
  const action = jest.fn();
  const detail = jest.fn();
  const render = (
    status: PetRecordsState['status'],
    records = emptyRecords,
    petId: string | null = 'pet-a',
  ) => (
    <ThemeProvider theme={createTheme('light')}>
      <TodayPhotoSection
        activePetId={petId}
        recordItems={records}
        recordStatus={status}
        season="winter"
        accentColor="#0754DA"
        onPressRecord={action}
        onPressRecordItem={detail}
      />
    </ThemeProvider>
  );

  it('waits for selection before showing empty art and keeps the existing record entry', async () => {
    const wait = deferred<TodayPhotoPickResult>();
    pick.mockReturnValue(wait.promise);
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render('ready'));
    });
    expect(
      renderer.root.findAllByProps({ testID: 'home-photo-empty' }),
    ).toHaveLength(0);
    await act(async () => wait.resolve({ record: null, mode: 'none' }));
    const button = renderer.root.findByType(TouchableOpacity);
    button.props.onPress();
    expect(action).toHaveBeenCalled();
    expect(
      renderer.root.findAllByProps({ testID: 'home-photo-empty' }).length,
    ).toBeGreaterThan(0);
    await act(async () => renderer.unmount());
  });

  it.each<PetRecordsState['status']>([
    'idle',
    'loading',
    'refreshing',
    'loadingMore',
    'error',
  ])('does not claim there are no photos while %s', async status => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render(status));
    });
    expect(pick).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'home-photo-empty' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  it('shows a failure, not a fake empty state, when the daily selection rejects', async () => {
    pick.mockRejectedValue(new Error('local selection failed'));
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render('ready'));
    });
    expect(
      renderer.root.findAllByProps({ testID: 'home-photo-error' }).length,
    ).toBeGreaterThan(0);
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  it('keeps the real photo, date overlay and detail navigation', async () => {
    pick.mockResolvedValue({ record: photo, mode: 'random' });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render('ready', [photo]));
    });
    expect(renderer.root.findByType(Image).props.source).toEqual({
      uri: 'https://example.test/photo.jpg',
    });
    renderer.root.findByType(TouchableOpacity).props.onPress();
    expect(detail).toHaveBeenCalledWith(photo.id);
    expect(
      renderer.root.findAllByProps({ testID: 'home-photo-empty' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  it('rejects a stale selection after a pet switch', async () => {
    const stale = deferred<TodayPhotoPickResult>();
    const next = deferred<TodayPhotoPickResult>();
    pick.mockReturnValueOnce(stale.promise).mockReturnValueOnce(next.promise);
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render('ready', [photo]));
    });
    await act(async () =>
      renderer.update(render('ready', emptyRecords, 'pet-b')),
    );
    await act(async () => stale.resolve({ record: photo, mode: 'random' }));
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    await act(async () => next.resolve({ record: null, mode: 'none' }));
    expect(
      renderer.root.findAllByProps({ testID: 'home-photo-empty' }).length,
    ).toBeGreaterThan(0);
    await act(async () => renderer.unmount());
  });
});
