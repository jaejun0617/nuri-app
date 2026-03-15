import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import {
  formatGuideAudienceLabel,
  getGuideCategoryIconName,
  getGuideCategoryLabel,
} from '../../services/guides/presentation';
import type { PetCareGuide } from '../../services/guides/types';

type Props = {
  guide: PetCareGuide;
  accentColor: string;
  accentDeepColor: string;
  tintColor: string;
  onPress: (guideId: string) => void;
};

function GuideRecommendationCardBase({
  guide,
  accentColor,
  accentDeepColor,
  tintColor,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.card}
      onPress={() => onPress(guide.id)}
    >
      <View style={[styles.thumb, { backgroundColor: tintColor }]}>
        <View style={styles.thumbInner}>
          <Feather
            name={getGuideCategoryIconName(guide.category)}
            size={20}
            color={accentColor}
          />
        </View>
      </View>

      <View style={styles.content}>
        <AppText preset="caption" style={[styles.eyebrow, { color: accentColor }]}>
          {getGuideCategoryLabel(guide.category)}
        </AppText>
        <AppText preset="body" style={styles.title} numberOfLines={2}>
          {guide.title}
        </AppText>
        <AppText preset="caption" style={styles.desc} numberOfLines={2}>
          {guide.summary}
        </AppText>
        <AppText
          preset="caption"
          style={[styles.audience, { color: accentDeepColor }]}
          numberOfLines={1}
        >
          {formatGuideAudienceLabel(guide)}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(GuideRecommendationCardBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInner: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.12)',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontWeight: '900',
  },
  title: {
    color: '#0B1220',
    fontWeight: '800',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  desc: {
    color: '#556070',
    fontWeight: '700',
    lineHeight: 17,
  },
  audience: {
    marginTop: 2,
    fontWeight: '800',
  },
});

