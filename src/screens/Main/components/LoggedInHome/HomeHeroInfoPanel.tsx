import React, { memo, type PropsWithChildren } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import AppText from '../../../../app/ui/AppText';
import Feather from '../../../../components/icons/NuriFeatherIcon';
import MaterialCommunityIcons from '../../../../components/icons/NuriMaterialIcon';
import NuriIcon from '../../../../components/icons/NuriIcon';
import { HomeSectionGlass } from '../../../../components/home/HomeSectionGlass';
import {
  HOME_FLOATING_WIDGET_MATERIAL,
  HomeFloatingWidgetSurface,
} from '../../../../components/home/HomeWidgetMaterial';
import {
  buildPetThemePalette,
  NEUTRAL_UI_PALETTE,
} from '../../../../services/pets/themePalette';
import type { HomeHeroMemoryChip } from '../../../../services/home/heroMemoryChip';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import {
  HOME_SEASONAL_BACKGROUND_GRADIENTS,
  HOME_SEASONAL_BACKGROUND_LOCATIONS,
} from '../../../../theme/home/seasonalAmbient';

export const HOME_HERO_PANEL_OVERLAP = 40;

/** The existing seasonal canvas continues behind the unchanged Home cards. */
export function HomeHeroContentSheet({
  season,
  children,
}: PropsWithChildren<{ season: SeasonKey }>) {
  return (
    <LinearGradient
      testID="home-hero-content-sheet"
      colors={[...HOME_SEASONAL_BACKGROUND_GRADIENTS[season]]}
      locations={[...HOME_SEASONAL_BACKGROUND_LOCATIONS]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      pointerEvents="box-none"
      accessible={false}
      style={[
        styles.sheet,
        { backgroundColor: HOME_SEASONAL_BACKGROUND_GRADIENTS[season][0] },
      ]}
    >
      {children}
    </LinearGradient>
  );
}

type Props = {
  petTheme: ReturnType<typeof buildPetThemePalette>;
  profilePetName: string;
  titleBadge: string | null;
  togetherDays: number | null;
  heroMemoryChip: HomeHeroMemoryChip | null;
  onPressPetProfileEdit: () => void;
  onPressProfileInfo: () => void;
  onPressMemoryChip: (memoryId: string) => void;
  onPressCreateMemory: () => void;
};

export const HomeHeroInfoPanel = memo(function HomeHeroInfoPanelView({
  petTheme,
  profilePetName,
  titleBadge,
  togetherDays,
  heroMemoryChip,
  onPressPetProfileEdit,
  onPressProfileInfo,
  onPressMemoryChip,
  onPressCreateMemory,
}: Props) {
  const dayLabel =
    togetherDays !== null ? togetherDays.toLocaleString('ko-KR') : null;

  return (
    <HomeSectionGlass testID="home-hero-info" style={styles.info}>
      <View testID="home-hero-identity" style={styles.identity}>
        <TouchableOpacity
          testID="home-hero-profile-edit"
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel={`${profilePetName} 프로필 수정`}
          onPress={onPressPetProfileEdit}
          style={styles.nameAction}
        >
          {titleBadge ? (
            <>
              <View testID="home-hero-title-badge" style={styles.badge}>
                <MaterialCommunityIcons
                  name="medal-outline"
                  size={styles.name.fontSize}
                  color={petTheme.deep}
                />
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={[styles.badgeText, { color: petTheme.deep }]}
                >
                  {titleBadge}
                </AppText>
              </View>
              <AppText
                testID="home-hero-title-separator"
                preset="unifiedMeta"
                styleOverridesPreset
                accessible={false}
                style={styles.titleSeparator}
              >
                ·
              </AppText>
            </>
          ) : null}
          <AppText
            preset="unifiedTitle"
            styleOverridesPreset
            style={styles.name}
          >
            {profilePetName}
          </AppText>
          <Feather
            name="chevron-right"
            size={18}
            color={NEUTRAL_UI_PALETTE.primary}
            accessible={false}
          />
        </TouchableOpacity>
        {dayLabel !== null ? (
          <View
            testID="home-hero-together"
            pointerEvents="none"
            accessible
            accessibilityLabel={`함께한 시간 ${dayLabel}일`}
            style={styles.together}
          >
            <NuriIcon name="heart" size={14} />
            <AppText
              preset="unifiedMeta"
              styleOverridesPreset
              style={styles.togetherText}
            >
              함께한 시간{' '}
              <AppText
                preset="unifiedMeta"
                styleOverridesPreset
                style={styles.days}
              >
                {dayLabel}
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={styles.dayUnit}
                >
                  일
                </AppText>
              </AppText>
            </AppText>
            <NuriIcon name="heart" size={14} />
          </View>
        ) : null}
      </View>

      <View testID="home-hero-footer" style={styles.footer}>
        {heroMemoryChip ? (
          <TouchableOpacity
            testID="home-hero-memory"
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={heroMemoryChip.accessibilityLabel}
            onPress={() => {
              if (heroMemoryChip.recordId) {
                onPressMemoryChip(heroMemoryChip.recordId);
                return;
              }
              onPressCreateMemory();
            }}
            style={styles.actionButton}
          >
            <HomeFloatingWidgetSurface
              radius={12}
              testIDPrefix="home-hero-memory-glass"
            />
            <AppText
              preset="unifiedMeta"
              styleOverridesPreset
              style={styles.memoryText}
            >
              {heroMemoryChip.label}
            </AppText>
            <Feather
              name="chevron-right"
              size={18}
              color={NEUTRAL_UI_PALETTE.primary}
              accessible={false}
            />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          testID="home-hero-profile-info"
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel={`${profilePetName} 더 알아보기`}
          onPress={onPressProfileInfo}
          style={styles.actionButton}
        >
          <HomeFloatingWidgetSurface
            radius={12}
            testIDPrefix="home-hero-profile-glass"
          />
          <AppText
            preset="unifiedLabel"
            styleOverridesPreset
            style={styles.actionText}
          >
            {profilePetName} 더 알아보기
          </AppText>
          <Feather
            name="chevron-right"
            size={18}
            color={NEUTRAL_UI_PALETTE.primary}
            accessible={false}
          />
        </TouchableOpacity>
      </View>
    </HomeSectionGlass>
  );
});

const styles = StyleSheet.create({
  sheet: {
    width: 'auto',
    marginHorizontal: -16,
    marginTop: -HOME_HERO_PANEL_OVERLAP,
    paddingHorizontal: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    overflow: 'hidden',
  },
  info: {
    // Only this glass reaches the sheet edges; its content keeps the Home inset.
    width: 'auto',
    marginHorizontal: -16,
    marginTop: 0,
    paddingTop: 18,
    paddingHorizontal: 30,
    paddingBottom: 18,
    gap: 8,
  },
  badge: {
    alignSelf: 'center',
    maxWidth: '100%',
    flexShrink: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: { fontSize: 20, lineHeight: 28, fontWeight: '700', flexShrink: 1 },
  identity: { gap: 0, alignItems: 'center' },
  nameAction: {
    minHeight: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  titleSeparator: {
    fontSize: 12,
    lineHeight: 18,
    color: NEUTRAL_UI_PALETTE.primary,
  },
  name: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: NEUTRAL_UI_PALETTE.deep,
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  together: {
    // Move only the passive readout closer; preserve the 48 dp heading target.
    marginTop: -4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  togetherText: {
    fontSize: 12,
    lineHeight: 18,
    color: NEUTRAL_UI_PALETTE.deep,
    flexShrink: 1,
  },
  days: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: NEUTRAL_UI_PALETTE.deep,
  },
  dayUnit: { fontSize: 12, lineHeight: 18, color: NEUTRAL_UI_PALETTE.deep },
  actionButton: {
    width: '100%',
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    ...HOME_FLOATING_WIDGET_MATERIAL,
  },
  memoryText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 18,
    color: NEUTRAL_UI_PALETTE.primary,
  },
  actionText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: NEUTRAL_UI_PALETTE.primary,
    textAlign: 'left',
    flex: 1,
    flexShrink: 1,
  },
});
