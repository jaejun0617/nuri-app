import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';

const artwork: Readonly<Record<string, ImageSourcePropType>> = {
  walk: require('../../assets/records/timeline/walk.png'),
  meal: require('../../assets/records/timeline/meal.png'),
  diary: require('../../assets/records/timeline/diary.png'),
  other: require('../../assets/records/timeline/other.png'),
  grooming: require('../../assets/records/timeline/grooming.png'),
  indoor: require('../../assets/records/timeline/indoor.png'),
  training: require('../../assets/records/timeline/training.png'),
  outing: require('../../assets/records/timeline/outing.png'),
  shopping: require('../../assets/records/timeline/shopping.png'),
  bathing: require('../../assets/records/timeline/bathing.png'),
  etc: require('../../assets/records/timeline/etc.png'),
  all: require('../../assets/records/timeline/all.png'),
  happy: require('../../assets/records/timeline/happy.png'),
  calm: require('../../assets/records/timeline/calm.png'),
  excited: require('../../assets/records/timeline/excited.png'),
  neutral: require('../../assets/records/timeline/neutral.png'),
  sad: require('../../assets/records/timeline/sad.png'),
  anxious: require('../../assets/records/timeline/anxious.png'),
  angry: require('../../assets/records/timeline/angry.png'),
  tired: require('../../assets/records/timeline/tired.png'),
  edit: require('../../assets/records/timeline/edit.png'),
  delete: require('../../assets/records/timeline/delete.png'),
  'empty-meal': require('../../assets/records/timeline/empty-meal.png'),
};

/** Original reference pixels, never user photos or replacement emoji. */
export default function TimelineArtwork({ name, size = 24, color }: { name: string; size?: number; color?: string }) {
  const source = artwork[name];
  if (!source) return null; // Health-only options retain their existing semantic icon.
  return <Image testID={`timeline-art-${name}`} source={source} resizeMode="contain"
    accessible={false} style={{ width: size, height: size, tintColor: color }} />;
}
