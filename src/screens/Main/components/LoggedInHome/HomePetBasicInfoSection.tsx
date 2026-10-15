import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '../../../../app/ui/AppText';
import NuriIcon from '../../../../components/icons/NuriIcon';
import { NEUTRAL_UI_PALETTE } from '../../../../services/pets/themePalette';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import { styles as homeStyles } from './LoggedInHome.styles';

export type HomePetBasicInfoValues = Readonly<{
  breed: string | null;
  age: string | null;
  weight: string | null;
  gender: string | null;
}>;

/** Display the existing formatted pet values; the sheet does not own pet data. */
export const HomePetBasicInfoSection = memo(function HomePetBasicInfoSectionView({
  info,
  season,
}: {
  info: HomePetBasicInfoValues;
  season: SeasonKey | null;
}) {
  const fields = [
    { label: '품종', value: info.breed },
    { label: '나이', value: info.age },
    { label: '몸무게', value: info.weight },
    { label: '성별', value: info.gender },
  ].map(field => ({ ...field, value: field.value?.trim() || '미입력' }));
  const summary = fields.map(field => field.value).join(' · ');

  return (
    <View
      testID="home-profile-basic-info"
      accessible
      accessibilityLabel={`이런 아이에요, ${fields.map(field => `${field.label} ${field.value}`).join(', ')}`}
      style={[
        homeStyles.profileSheetRow,
        season === 'winter' ? homeStyles.winterProfileSheetRow : null,
        season === 'spring' ? homeStyles.springProfileSheetRow : null,
        season === 'summer' ? homeStyles.summerProfileSheetRow : null,
        styles.section,
      ]}
    >
      <View style={[homeStyles.profileSheetIconCircle, homeStyles.iconCircleBlue]}>
        <NuriIcon name="pet" size={16} />
      </View>
      <View style={[homeStyles.profileSheetRowContent, styles.content]}>
        <AppText
          testID="home-profile-intro-title"
          preset="unifiedMeta"
          styleOverridesPreset
          style={[homeStyles.profileSheetRowLabel, styles.title]}
        >
          이런 아이에요
        </AppText>
        <AppText
          testID="home-profile-basic-summary"
          preset="unifiedMeta"
          styleOverridesPreset
          style={styles.summary}
        >
          {summary}
        </AppText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingRight: 14,
    marginBottom: 9,
  },
  content: { flexDirection: 'column', alignItems: 'stretch', gap: 2 },
  title: { color: NEUTRAL_UI_PALETTE.deep },
  summary: {
    minWidth: 0,
    fontSize: 12,
    lineHeight: 18,
    color: NEUTRAL_UI_PALETTE.primary,
  },
});
