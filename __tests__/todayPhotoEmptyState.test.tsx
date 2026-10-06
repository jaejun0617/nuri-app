import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import CtaButton from '../src/app/ui/CtaButton';
import { createTheme } from '../src/app/theme/theme';
import {
  pickTodayPhoto,
  type TodayPhotoPickResult,
} from '../src/services/home/homeRecall';
import type { MemoryRecord } from '../src/services/supabase/memories';
import type { PetRecordsState } from '../src/store/recordStore';
import { useSignedMemoryImage } from '../src/hooks/useSignedMemoryImage';
import { TodayPhotoSection } from '../src/screens/Main/components/LoggedInHome/TodayPhotoSection';

jest.mock('../src/services/home/homeRecall', () => ({
  pickTodayPhoto: jest.fn(),
}));
jest.mock('../src/hooks/useSignedMemoryImage', () => ({
  useSignedMemoryImage: jest.fn(),
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/providers/AppFontPreferenceProvider', () => ({
  FixedTypographyBoundary: ({ children }: { children: React.ReactNode }) =>
    children,
}));

const pick = jest.mocked(pickTodayPhoto);
const signedImage = jest.mocked(useSignedMemoryImage);
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
  beforeEach(() => {
    pick.mockReset();
    signedImage.mockReset().mockReturnValue({
      signedUrl: 'https://example.test/photo.jpg',
      loading: false,
      resolved: true,
    });
  });
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
    const button = renderer.root.findByType(CtaButton);
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

  it('keeps the real photo and date with an independent album caption and detail navigation', async () => {
    pick.mockResolvedValue({ record: photo, mode: 'random' });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render('ready', [photo]));
    });
    expect(renderer.root.findByType(Image).props.source).toEqual({
      uri: 'https://example.test/photo.jpg',
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('실제 사진 기록');
    expect(JSON.stringify(renderer.toJSON())).toContain('2026.10.01');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('rgba(0,0,0,0.14)');
    renderer.root.findByType(TouchableOpacity).props.onPress();
    expect(detail).toHaveBeenCalledWith(photo.id);
    expect(
      renderer.root.findAllByProps({ testID: 'home-photo-empty' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  it.each(['pending', 'missing-url', 'download-error'] as const)(
    'keeps a real record navigable during %s',
    async state => {
      pick.mockResolvedValue({ record: photo, mode: 'random' });
      if (state === 'pending')
        signedImage.mockReturnValue({
          signedUrl: null,
          loading: true,
          resolved: false,
        });
      if (state === 'missing-url')
        signedImage.mockReturnValue({
          signedUrl: null,
          loading: false,
          resolved: true,
        });
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(render('ready', [photo]));
      });
      if (state === 'download-error') {
        await act(async () => renderer.root.findByType(Image).props.onError());
      }
      const output = JSON.stringify(renderer.toJSON());
      expect(output).toContain('실제 사진 기록');
      expect(output).not.toContain('home-photo-empty');
      if (state !== 'pending')
        expect(output).toContain('사진을 불러오지 못했어요.');
      renderer.root.findByType(TouchableOpacity).props.onPress();
      expect(detail).toHaveBeenCalledWith(photo.id);
      await act(async () => renderer.unmount());
    },
  );

  it('resets image failure when the selected record image identity changes', async () => {
    pick.mockResolvedValue({ record: photo, mode: 'random' });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render('ready', [photo]));
    });
    await act(async () => renderer.root.findByType(Image).props.onError());
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    const changed = { ...photo, imagePaths: ['pet-a/replaced.jpg'] };
    pick.mockResolvedValue({ record: changed, mode: 'random' });
    await act(async () => renderer.update(render('ready', [changed])));
    expect(renderer.root.findAllByType(Image)).toHaveLength(1);
    expect(signedImage).toHaveBeenLastCalledWith('pet-a/replaced.jpg');
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
