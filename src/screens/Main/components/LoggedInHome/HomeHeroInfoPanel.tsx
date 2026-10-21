import React, { memo, type PropsWithChildren } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import AppText from '../../../../app/ui/AppText';
import Feather from '../../../../components/icons/NuriFeatherIcon';
import MaterialCommunityIcons from '../../../../components/icons/NuriMaterialIcon';
import { buildPetThemePalette } from '../../../../services/pets/themePalette';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import { HOME_HERO_COLORS, HOME_HERO_ACCENT, getHomeHeroTypography, type HomeHeroColors } from '../../../../theme/home/heroLayout';

/** Same reference canvas below Hero; lower content and its 16 dp grid survive. */
export function HomeHeroContentSheet({ children }: PropsWithChildren<{ season: SeasonKey }>) {
  return (
    <View
      testID="home-hero-content-sheet"
      pointerEvents="box-none"
      style={styles.sheetBody}
    >
      {children}
    </View>
  );
}

type Props = {
  colors?: HomeHeroColors;
  petTheme: ReturnType<typeof buildPetThemePalette>;
  containerWidth: number;
  profilePetName: string;
  titleBadge: string | null;
  togetherDays: number | null;
  hasMultiplePets: boolean;
  onPressPetSelect: () => void;
  onPressProfileInfo: () => void;
  onPressPetProfileEdit: () => void;
};

export const HomeHeroInfoPanel = memo(function HomeHeroInfoPanelView({
  containerWidth, profilePetName, titleBadge, togetherDays, colors = HOME_HERO_COLORS,
  hasMultiplePets, onPressPetSelect, onPressProfileInfo, onPressPetProfileEdit,
}: Props) {
  const type = getHomeHeroTypography(containerWidth, profilePetName);
  const dayLabel = togetherDays !== null ? togetherDays.toLocaleString('ko-KR') : null;
  return (
    <View testID="home-hero-info" style={[styles.info, { paddingTop: type.infoTop, backgroundColor: colors.surface }]}>
      <View testID="home-hero-title-slot" style={styles.badgeSlot}>
        {titleBadge ? (
          <View testID="home-hero-title-badge" style={[styles.badge, { borderColor: HOME_HERO_ACCENT.border }]}>
            <MaterialCommunityIcons name="sprout" size={16} color={HOME_HERO_ACCENT.primary} accessible={false} />
            <AppText
              preset="unifiedMeta" styleOverridesPreset numberOfLines={2} ellipsizeMode="tail"
              style={[styles.badgeText, { color: HOME_HERO_ACCENT.primary, fontSize: type.badgeSize }]}
            >{titleBadge}</AppText>
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        testID="home-hero-pet-selector" activeOpacity={0.86} disabled={!hasMultiplePets}
        accessibilityRole={hasMultiplePets ? 'button' : undefined}
        accessibilityLabel={hasMultiplePets ? `${profilePetName}, 아이 선택` : profilePetName}
        onPress={onPressPetSelect} style={styles.nameAction}
      >
        {hasMultiplePets ? <View testID="home-hero-name-balance" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.selectorIconSlot} /> : null}
        <AppText
          testID="home-hero-pet-name" preset="unifiedTitle" styleOverridesPreset
          numberOfLines={2} ellipsizeMode="tail"
          style={[styles.name, { color: colors.ink, fontSize: type.nameSize, lineHeight: type.nameLineHeight }]}
        >{profilePetName}</AppText>
        {hasMultiplePets ? <View accessible={false} style={styles.selectorIconSlot}><Feather name="chevron-down" size={24} color={colors.ink} accessible={false} /></View> : null}
      </TouchableOpacity>
      {dayLabel !== null ? (
        <View testID="home-hero-together" accessible accessibilityLabel={`함께한 시간 ${dayLabel}일`} style={styles.together}>
          <AppText testID="home-hero-together-label" preset="unifiedMeta" styleOverridesPreset style={[styles.togetherText, { color: colors.muted, fontSize: type.labelSize }]}>함께한 시간</AppText>
          <AppText testID="home-hero-day-value" preset="unifiedMeta" styleOverridesPreset style={[styles.days, { color: HOME_HERO_ACCENT.primary, fontSize: type.valueSize }]}>{dayLabel}일</AppText>
        </View>
      ) : null}
      <View testID="home-hero-profile-actions" style={[styles.profileActions, { marginHorizontal: type.actionInset }]}>
        <TouchableOpacity
          testID="home-hero-profile-info" activeOpacity={0.86} accessibilityRole="button"
          accessibilityLabel={`${profilePetName} 더 알아보기`} onPress={onPressProfileInfo}
          style={[styles.actionButton, { backgroundColor: HOME_HERO_ACCENT.tint }]}
        >
          <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.actionIconSlot} />
          <AppText testID="home-hero-profile-info-label" preset="unifiedLabel" styleOverridesPreset numberOfLines={2} ellipsizeMode="tail" style={[styles.actionText, { color: colors.ink, fontSize: type.buttonSize }]}>{profilePetName} 더 알아보기</AppText>
          <View accessible={false} style={styles.actionIconSlot}><Feather name="chevron-right" size={22} color={colors.ink} accessible={false} /></View>
        </TouchableOpacity>
        <TouchableOpacity
          testID="home-hero-profile-edit" activeOpacity={0.86} accessibilityRole="button"
          accessibilityLabel={`${profilePetName} 프로필 수정하기`} onPress={onPressPetProfileEdit}
          style={[styles.editButton, { borderColor: HOME_HERO_ACCENT.border, backgroundColor: HOME_HERO_ACCENT.editSurface }]}
        >
          <Feather name="edit-2" size={24} color={HOME_HERO_ACCENT.primary} accessible={false} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sheetBody: { width: '100%', paddingHorizontal: 16, backgroundColor: HOME_HERO_COLORS.surface },
  info: { width: '100%', paddingBottom: 24, backgroundColor: HOME_HERO_COLORS.surface },
  badgeSlot: { minHeight: 28, alignItems: 'center', marginHorizontal: 24 },
  badge: { maxWidth: '100%', minHeight: 28, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { lineHeight: 16, fontWeight: '500', flexShrink: 1, includeFontPadding: false },
  nameAction: { minHeight: 48, marginTop: 8, marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', gap: 8 },
  selectorIconSlot: { width: 24, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  name: { color: HOME_HERO_COLORS.ink, fontWeight: '600', flexShrink: 1, minWidth: 0, textAlign: 'center', includeFontPadding: false },
  together: { marginTop: 4, minHeight: 32, paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', columnGap: 10, rowGap: 2 },
  togetherText: { lineHeight: 20, color: HOME_HERO_COLORS.muted, fontWeight: '500', includeFontPadding: false },
  days: { lineHeight: 32, fontWeight: '500', includeFontPadding: false },
  profileActions: { marginTop: 6, flexDirection: 'row', alignItems: 'stretch', gap: 7 },
  actionButton: { flex: 1, minWidth: 0, minHeight: 51, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionText: { color: HOME_HERO_COLORS.ink, lineHeight: 20, fontWeight: '500', textAlign: 'center', flexShrink: 1, minWidth: 0, includeFontPadding: false },
  actionIconSlot: { width: 22, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  editButton: { width: 54, minHeight: 51, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
