import React from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '../../../../app/ui/AppText';

/** The bell owns accessibility; its badge is a compact visual count only. */
export function HomeNotificationBadge({ count }: { count: number }) {
  if (!Number.isSafeInteger(count) || count <= 0) return null;
  return (
    <View
      testID="home-notification-badge"
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.badge}
    >
      <AppText
        testID="home-notification-badge-count"
        preset="unifiedLabel"
        styleOverridesPreset
        style={styles.count}
      >
        {count > 99 ? '99+' : String(count)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 20,
    minHeight: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B33C76',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#59233F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  count: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    letterSpacing: 0,
    textAlign: 'center',
  },
});
