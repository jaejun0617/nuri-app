import React from 'react';
import { Platform, ScrollView } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider as StyledThemeProvider } from 'styled-components/native';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';

import { createTheme } from '../src/app/theme/theme';
import {
  getNotificationSettingsMaxHeight,
  NotificationSettingsModal,
} from '../src/screens/More/MoreDrawerContent';

function ThemeProvider({children,theme}:React.ComponentProps<typeof StyledThemeProvider>){
 const [client]=React.useState(()=>new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}}));
 return <QueryClientProvider client={client}><StyledThemeProvider theme={theme}>{children}</StyledThemeProvider></QueryClientProvider>;
}

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
              onClose={jest.fn()}
              onRefreshSettings={jest.fn().mockResolvedValue(undefined)}
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

  it('renders channel status as a non-interactive text row without an arrow', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    let renderer!: TestRenderer.ReactTestRenderer;
    try {
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><NotificationSettingsModal
          visible bottomInset={0} enabled permissionStatus="granted" loading={false}
          settings={{ enabled: true, platform: 'android', nativeSupported: true, permission: 'granted', exactAlarm: 'granted', channel: 'ready', delivery: 'exact', canOpenExactAlarmSettings: true }}
          onClose={jest.fn()} onRefreshSettings={jest.fn().mockResolvedValue(undefined)} onOpenSystemSettings={jest.fn()} onOpenExactAlarmSettings={jest.fn()}
        /></ThemeProvider>);
      });
      const rows = renderer.root.findAll(node => typeof node.type === 'string' && node.props.testID === 'notification-settings-channels');
      expect(rows).toHaveLength(1);
      expect(rows[0].props.accessibilityRole).toBe('text');
      expect(rows[0].props.onPress).toBeUndefined();
      expect(rows[0].findAll(node => node.props.name === 'chevron-right')).toHaveLength(0);
    } finally {
      if (renderer) await TestRenderer.act(async () => renderer.unmount());
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });
});
