import React from 'react';
import { Platform, ScrollView } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import {
  getNotificationSettingsMaxHeight,
  NotificationSettingsModal,
} from '../src/screens/More/MoreDrawerContent';

describe('schedule notification settings modal', () => {
  it('keeps the settings content bounded and hides Android-only status on iOS', () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    let renderer!: TestRenderer.ReactTestRenderer;
    try {
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <NotificationSettingsModal
              visible
              bottomInset={0}
              enabled
              pushOptIn={false}
              pushProviderStatus="unknown"
              permissionStatus="granted"
              settings={{
                enabled: true,
                platform: 'ios',
                nativeSupported: true,
                permission: 'granted',
                exactAlarm: 'not-required',
                channel: 'not-required',
                delivery: 'exact',
                canOpenExactAlarmSettings: false,
              }}
              loading={false}
              accentColor="#8B5CF6"
              onClose={jest.fn()}
              onToggleEnabled={jest.fn()}
              onTogglePushOptIn={jest.fn()}
              onRequestPermission={jest.fn()}
              onOpenSystemSettings={jest.fn()}
              onOpenExactAlarmSettings={jest.fn()}
            />
          </ThemeProvider>,
        );
      });

      const scrollView = renderer.root.findByType(ScrollView);
      const scrollStyle = scrollView.props.style as Array<
        Record<string, unknown>
      >;
      const maxHeightStyle = scrollStyle.find(
        style => typeof style?.maxHeight === 'number',
      );

      expect(maxHeightStyle?.maxHeight).toBeGreaterThan(0);
      expect(
        renderer.root.findAll(
          node =>
            typeof node.props?.children === 'string' &&
            node.props.children.includes('Android '),
        ),
      ).toHaveLength(0);
    } finally {
      if (renderer) TestRenderer.act(() => renderer.unmount());
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    }
  });

  it('keeps the content below the viewport on a short device', () => {
    const maxHeight = getNotificationSettingsMaxHeight(430, 24);

    expect(maxHeight).toBeLessThanOrEqual(430 - 24 - 150);
    expect(maxHeight).toBeLessThan(280);
  });
});
