import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import { HomeNotificationBadge } from '../src/screens/Main/components/LoggedInHome/HomeNotificationBadge';

describe('Home notification badge', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])('hides an absent or invalid count: %s', async count => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<HomeNotificationBadge count={count} />);
    });
    expect(renderer.toJSON()).toBeNull();
    await act(async () => renderer.unmount());
  });

  it.each([[1, '1'], [9, '9'], [10, '10'], [99, '99'], [100, '99+'], [1234, '99+']] as const)(
    'shows %s without duplicating the bell accessibility label', async (count, expected) => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <HomeNotificationBadge count={count} />
          </ThemeProvider>,
        );
      });
      const badge = renderer.root.findByProps({ testID: 'home-notification-badge' });
      const label = renderer.root.findByProps({ testID: 'home-notification-badge-count' });
      expect(label.props.children).toBe(expected);
      expect(badge.props).toMatchObject({ pointerEvents: 'none', accessible: false, importantForAccessibility: 'no-hide-descendants' });
      expect(StyleSheet.flatten(badge.props.style)).toMatchObject({ minWidth: 20, minHeight: 20, top: 0, right: 0, borderColor: '#FFFFFF' });
      expect(StyleSheet.flatten(badge.props.style)).not.toHaveProperty('height');
      expect(label.props.allowFontScaling).not.toBe(false);
      await act(async () => renderer.unmount());
    },
  );
});
