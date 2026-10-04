import React, { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import AppText from '../../app/ui/AppText';
import { SectionHeaderAction } from '../../app/ui/SectionHeaderAction';

type Props = {
  title: string;
  color: string;
  description?: string;
  emphasis?: { title: string; color: string };
  hideAction?: boolean;
  action?: { onPress: () => void; accessibilityLabel: string };
};

/** Loading and unavailable data must not be mistaken for a confirmed empty list. */
export function isHomeSectionConfirmedEmpty(
  isReady: boolean,
  itemCount: number | null,
): boolean {
  return isReady && itemCount === 0;
}

/** Home headings share a text baseline; destination names remain accessible. */
export const HomeSectionHeader = memo(function HomeSectionHeaderView({
  title,
  color,
  description,
  emphasis,
  hideAction = false,
  action,
}: Props) {
  const { fontScale } = useWindowDimensions();
  const stackAction = !!action && !hideAction && fontScale >= 1.3;

  return (
    <View style={styles.container}>
      <View
        testID="home-section-header"
        style={[styles.row, stackAction ? styles.stackedRow : null]}
      >
        <View style={[styles.heading, stackAction ? styles.stackedHeading : null]}>
          <AppText
            accessibilityRole="header"
            typographyRole="sectionTitle"
            preset="unifiedTitle"
            styleOverridesPreset
            style={[
              styles.title,
              emphasis ? styles.leadTitle : null,
              { color },
            ]}
          >
            {title}
          </AppText>
          {description && !emphasis ? (
            <AppText preset="unifiedBody" style={styles.description}>
              {description}
            </AppText>
          ) : null}
        </View>
        {action && !hideAction ? (
          <SectionHeaderAction
            color={color}
            onPress={action.onPress}
            accessibilityLabel={action.accessibilityLabel}
            textPreset="unifiedMicro"
            size="compact"
          />
        ) : null}
      </View>
      {emphasis ? (
        <View style={styles.emphasisBlock}>
          <AppText
            accessibilityRole="header"
            typographyRole="sectionTitle"
            preset="unifiedTitle"
            styleOverridesPreset
            style={[styles.emphasisTitle, { color: emphasis.color }]}
          >
            {emphasis.title}
          </AppText>
          {description ? (
            <AppText preset="unifiedBody" style={styles.description}>
              {description}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { width: '100%' },
  row: {
    width: '100%',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  heading: { flex: 1, minWidth: 0, gap: 4 },
  stackedRow: { flexDirection: 'column', alignItems: 'flex-end' },
  stackedHeading: { flex: 0, width: '100%' },
  title: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0,
  },
  leadTitle: { fontSize: 22, lineHeight: 30 },
  emphasisBlock: { gap: 10 },
  emphasisTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: 0,
  },
  description: { color: '#697386', flexShrink: 1 },
});
