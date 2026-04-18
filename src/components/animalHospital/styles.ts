import { StyleSheet } from 'react-native';

import type { AppTheme } from '../../app/theme/theme';
import type { AnimalHospitalTrustTone } from '../../domains/animalHospital/presentation';

function resolveTrustToneColor(theme: AppTheme, tone: AnimalHospitalTrustTone) {
  if (tone === 'calm') {
    return {
      background: 'rgba(46, 127, 82, 0.10)',
      text: '#2E7F52',
      border: 'rgba(46, 127, 82, 0.18)',
    };
  }

  if (tone === 'caution') {
    return {
      background: 'rgba(168, 108, 39, 0.10)',
      text: '#9A6328',
      border: 'rgba(168, 108, 39, 0.16)',
    };
  }

  return {
    background: theme.colors.surface,
    text: theme.colors.textSecondary,
    border: theme.colors.border,
  };
}

export function createAnimalHospitalCardStyles(
  theme: AppTheme,
  tone: AnimalHospitalTrustTone,
) {
  const trust = resolveTrustToneColor(theme, tone);

  return StyleSheet.create({
    card: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      padding: 18,
      gap: 16,
    },
    selectedCard: {
      borderColor: trust.border,
    },
    pressable: {
      gap: 14,
    },
    eyebrow: {
      color: theme.colors.textMuted,
      letterSpacing: 0.2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
      gap: 4,
    },
    trustBadge: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: trust.background,
      borderWidth: 1,
      borderColor: trust.border,
    },
    trustBadgeText: {
      color: trust.text,
      fontWeight: '700',
    },
    keyline: {
      height: 1,
      backgroundColor: theme.colors.border,
    },
    primaryMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'center',
    },
    distanceText: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    addressText: {
      color: theme.colors.textSecondary,
    },
    statusText: {
      color: theme.colors.textPrimary,
    },
    phoneText: {
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    secondaryAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryActionSelected: {
      borderColor: trust.border,
      backgroundColor: trust.background,
    },
    secondaryActionText: {
      color: theme.colors.textSecondary,
      fontWeight: '700',
    },
    primaryAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryActionText: {
      color: theme.colors.surfaceElevated,
      fontWeight: '700',
    },
  });
}

export function createAnimalHospitalDetailStyles(
  theme: AppTheme,
  tone: AnimalHospitalTrustTone,
) {
  const trust = resolveTrustToneColor(theme, tone);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 18,
    },
    hero: {
      borderRadius: 26,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      padding: 22,
      gap: 18,
    },
    heroHeader: {
      gap: 8,
    },
    eyebrow: {
      color: theme.colors.textMuted,
      letterSpacing: 0.2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    trustRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    trustBadge: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: trust.background,
      borderWidth: 1,
      borderColor: trust.border,
    },
    trustBadgeText: {
      color: trust.text,
      fontWeight: '700',
    },
    statusText: {
      color: theme.colors.textSecondary,
    },
    infoBlock: {
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    infoText: {
      flex: 1,
      color: theme.colors.textPrimary,
    },
    subtleText: {
      color: theme.colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
    },
    ctaRow: {
      gap: 10,
    },
    primaryCta: {
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: theme.colors.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryCta: {
      minHeight: 46,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryCtaText: {
      color: theme.colors.surfaceElevated,
      fontWeight: '700',
    },
    secondaryCtaText: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    sectionCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      padding: 18,
      gap: 10,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    bodyText: {
      color: theme.colors.textSecondary,
    },
  });
}
