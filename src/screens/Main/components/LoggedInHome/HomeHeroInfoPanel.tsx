import React, { memo, type PropsWithChildren } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import AppText from '../../../../app/ui/AppText';
import Feather from '../../../../components/icons/NuriFeatherIcon';
import MaterialCommunityIcons from '../../../../components/icons/NuriMaterialIcon';
import NuriIcon from '../../../../components/icons/NuriIcon';
import {
  HOME_FLOATING_WIDGET_MATERIAL,
  HomeFloatingWidgetSurface,
} from '../../../../components/home/HomeWidgetMaterial';
import {
  buildPetThemePalette,
  NEUTRAL_UI_PALETTE,
} from '../../../../services/pets/themePalette';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import {
  HOME_SEASONAL_BACKGROUND_GRADIENTS,
  HOME_SEASONAL_BACKGROUND_LOCATIONS,
} from '../../../../theme/home/seasonalAmbient';
import { HomeHeroWaveOrnaments } from './HomeHeroDecorations';

export const HOME_HERO_PANEL_OVERLAP = 40;

/** The existing seasonal canvas continues behind the unchanged Home cards. */
export function HomeHeroContentSheet({
  season,
  children,
}: PropsWithChildren<{ season: SeasonKey }>) {
  return (
    <View
      testID="home-hero-content-sheet"
      pointerEvents="box-none"
      accessible={false}
      style={styles.sheet}
    >
      {/* Only the 40 dp edge is rasterized; no full-page native mask is needed. */}
      <Image
        testID="home-hero-wave"
        source={require('../../../../assets/seasonal/home/hero-wave-edge-v1.png')}
        tintColor={HOME_SEASONAL_BACKGROUND_GRADIENTS[season][0]}
        resizeMode="stretch"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.wave}
      />
      <LinearGradient
        testID="home-hero-content-gradient"
        colors={[...HOME_SEASONAL_BACKGROUND_GRADIENTS[season]]}
        locations={[...HOME_SEASONAL_BACKGROUND_LOCATIONS]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="box-none"
        accessible={false}
        style={[
          styles.sheetBody,
          { backgroundColor: HOME_SEASONAL_BACKGROUND_GRADIENTS[season][0] },
        ]}
      >
        {children}
      </LinearGradient>
      <HomeHeroWaveOrnaments season={season} />
    </View>
  );
}

type Props = {
  petTheme: ReturnType<typeof buildPetThemePalette>;
  profilePetName: string;
  titleBadge: string | null;
  togetherDays: number | null;
  hasMultiplePets: boolean;
  onPressPetSelect: () => void;
  onPressProfileInfo: () => void;
  onPressPetProfileEdit: () => void;
};

export const HomeHeroInfoPanel = memo(function HomeHeroInfoPanelView({
  petTheme,
  profilePetName,
  titleBadge,
  togetherDays,
  hasMultiplePets,
  onPressPetSelect,
  onPressProfileInfo,
  onPressPetProfileEdit,
}: Props) {
  const identityTextStyle = { color: petTheme.primary };
  const dayLabel =
    togetherDays !== null ? togetherDays.toLocaleString('ko-KR') : null;

  return (
    <View testID="home-hero-info" style={styles.info}>
      <View testID="home-hero-identity" style={styles.identity}>
        <TouchableOpacity
          testID="home-hero-pet-selector"
          activeOpacity={0.86}
          disabled={!hasMultiplePets}
          accessibilityRole={hasMultiplePets ? 'button' : undefined}
          accessibilityLabel={
            hasMultiplePets ? `${profilePetName}, 아이 선택` : profilePetName
          }
          onPress={onPressPetSelect}
          style={styles.nameAction}
        >
          {titleBadge ? (
            <>
              <View testID="home-hero-title-badge" style={styles.badge}>
                <MaterialCommunityIcons
                  name="medal-outline"
                  size={styles.name.fontSize}
                  color={petTheme.primary}
                />
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={[styles.badgeText, identityTextStyle]}
                >
                  {titleBadge}
                </AppText>
              </View>
              <AppText
                testID="home-hero-title-separator"
                preset="unifiedMeta"
                styleOverridesPreset
                accessible={false}
                style={[styles.titleSeparator, identityTextStyle]}
              >
                ·
              </AppText>
            </>
          ) : null}
          <AppText
            preset="unifiedTitle"
            styleOverridesPreset
            style={[styles.name, identityTextStyle]}
          >
            {profilePetName}
          </AppText>
          {hasMultiplePets ? (
            <Feather
              name="chevron-down"
              size={18}
              color={petTheme.primary}
              accessible={false}
            />
          ) : null}
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
              style={[styles.togetherText, identityTextStyle]}
            >
              함께한 시간{' '}
              <AppText
                preset="unifiedMeta"
                styleOverridesPreset
                style={[styles.days, identityTextStyle]}
              >
                {dayLabel}
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={[styles.dayUnit, identityTextStyle]}
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
        <View testID="home-hero-profile-actions" style={styles.profileActions}>
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
            <View
              testID="home-hero-profile-info-leading"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.actionIconSlot}
            />
            <AppText
              preset="unifiedLabel"
              styleOverridesPreset
              style={styles.actionText}
            >
              {profilePetName} 더 알아보기
            </AppText>
            <View
              testID="home-hero-profile-info-trailing"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.actionIconSlot}
            />
          </TouchableOpacity>
          <TouchableOpacity
            testID="home-hero-profile-edit"
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={`${profilePetName} 프로필 수정하기`}
            onPress={onPressPetProfileEdit}
            style={styles.actionButton}
          >
            <HomeFloatingWidgetSurface
              radius={12}
              testIDPrefix="home-hero-edit-glass"
            />
            <View
              testID="home-hero-profile-edit-leading"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.actionIconSlot}
            />
            <AppText
              preset="unifiedLabel"
              styleOverridesPreset
              style={styles.actionText}
            >
              프로필 수정하기
            </AppText>
            <View
              testID="home-hero-profile-edit-trailing"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.actionIconSlot}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sheet: {
    width: 'auto',
    marginHorizontal: -16,
    marginTop: -HOME_HERO_PANEL_OVERLAP,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    overflow: 'visible',
  },
  wave: { width: '100%', height: HOME_HERO_PANEL_OVERLAP },
  sheetBody: { paddingHorizontal: 16 },
  info: {
    // Keep the existing geometry while exposing the seasonal canvas underneath.
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
  profileActions: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
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
  actionText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: NEUTRAL_UI_PALETTE.primary,
    textAlign: 'center',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  // Preserve equal side spacing so removing arrows does not shift the labels.
  actionIconSlot: {
    width: 20,
    height: 20,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
