import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { View } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import WalkView from '../src/screens/DevTest/walkPresentation/WalkView';
import { finishArtwork } from '../src/screens/DevTest/walkPresentation/finishArtwork';
import {
  minimizeNotice,
  noticeForError,
  WALK_NOTICE_COPY,
} from '../src/screens/DevTest/walkPresentation/noticeModel';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriFeatherIcon', () => 'Feather');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'SemanticIcon');
jest.mock(
  '../src/screens/DevTest/walkPresentation/WalkWeatherChip',
  () => 'WalkWeatherChip',
);
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({
    width: 384,
    height: 832,
    scale: 3,
    fontScale: mockFontScale,
  }),
}));

describe('seasonal finish assets and persistent pause presentation', () => {
  test.each([
    ['WALKING', 'MINIMIZE_ACTIVE'],
    ['PAUSED', 'MINIMIZE_PAUSED'],
    ['RECOVERY_REQUIRED', 'MINIMIZE_RECOVERY'],
  ] as const)(
    'minimize %s truthfully describes its recording state',
    (state, kind) => {
      expect(minimizeNotice(state)).toBe(kind);
      const body = WALK_NOTICE_COPY[kind].body;
      if (state === 'WALKING') expect(body).toContain('기록은 이어져요');
      else expect(body).not.toContain('기록은 이어져요');
    },
  );
  test.each([
    ['WALK_LOCATION_PERMISSION_REQUIRED', 'PERMISSION_REQUIRED'],
    ['WALK_PRECISE_LOCATION_REQUIRED', 'PERMISSION_REQUIRED'],
    ['WALK_LOCATION_SERVICES_DISABLED', 'LOCATION_DISABLED'],
    ['WALK_SERVICE_UNAVAILABLE', 'REQUEST_FAILED'],
    ['READY', null],
    ['PASS', null],
    ['private arbitrary exception', null],
  ] as const)('stable code %s maps to safe presentation', (code, kind) => {
    expect(noticeForError(code)).toBe(kind);
  });
  const assets = {
    spring: [
      require('../src/assets/images/walk/finished-local-spring-v1.png'),
      require('../src/assets/images/walk/finish-confirm-spring-v1.png'),
    ],
    summer: [
      require('../src/assets/images/walk/finished-local-summer-v1.png'),
      require('../src/assets/images/walk/finish-confirm-summer-v1.png'),
    ],
    winter: [
      require('../src/assets/images/walk/finished-local-winter-v1.png'),
      require('../src/assets/images/walk/finish-confirm-winter-v1.png'),
    ],
  };
  test.each(['spring', 'summer', 'winter'] as const)(
    '%s has two dedicated assets, not pre-walk reuse',
    season => {
      expect(finishArtwork(season)).toBe(assets[season][0]);
      expect(finishArtwork(season, true)).toBe(assets[season][1]);
      expect(finishArtwork(season)).not.toBe(finishArtwork(season, true));
    },
  );
  test('approved autumn assets remain unchanged', () => {
    expect(finishArtwork('autumn')).toBe(
      require('../src/assets/images/walk/finished-local-autumn-v1.png'),
    );
    expect(finishArtwork('autumn', true)).toBe(
      require('../src/assets/images/walk/finish-confirm-autumn-v1.png'),
    );
  });
  test.each([1, 1.3])(
    'paused copy remains explicit after the rest sheet is dismissed at fontScale %s',
    async fontScale => {
      mockFontScale = fontScale;
      let tree!: Renderer.ReactTestRenderer;
      await act(async () => {
        tree = Renderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <WalkView
              state="PAUSED"
              petName="여섯글자아이"
              season="autumn"
              preview
              publicPreview
              distanceM="2430"
              activeMs="1920000"
              busy={false}
              map={<View />}
              insetTop={24}
              insetBottom={24}
              freeLook={false}
              error={false}
              qualityLabel="양호"
              onClose={jest.fn()}
              onQa={jest.fn()}
              onRecenter={jest.fn()}
              onPrimary={jest.fn()}
              onFinish={jest.fn()}
              onCancelFinish={jest.fn()}
            />
          </ThemeProvider>,
        );
      });
      expect(
        tree.root.findAllByProps({ testID: 'walk-paused-status' }).length,
      ).toBeGreaterThan(0);
      expect(
        tree.root.findAllByProps({ testID: 'walk-supporting-copy' })[0].props
          .children,
      ).toBe('시간과 거리 기록을 멈췄어요');
      expect(
        tree.root.findAllByProps({ testID: 'walk-time-group' }).length,
      ).toBeGreaterThan(0);
      await act(async () => tree.unmount());
    },
  );
});
