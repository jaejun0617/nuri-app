import type { ImageSourcePropType } from 'react-native';
import type { TutorialId } from './catalog';

const art = {
  home: require('../../assets/tutorial/home-v1.webp') as ImageSourcePropType,
  record: require('../../assets/tutorial/record-v1.webp') as ImageSourcePropType,
  gallery: require('../../assets/tutorial/gallery-v1.webp') as ImageSourcePropType,
  schedule: require('../../assets/tutorial/schedule-v1.webp') as ImageSourcePropType,
  profile: require('../../assets/tutorial/profile-v1.webp') as ImageSourcePropType,
  font: require('../../assets/tutorial/font-v1.webp') as ImageSourcePropType,
};
type Artwork = keyof typeof art;
export const tutorialArtworkByStep = {
  home: ['home', 'record', 'home'],
  record: ['record', 'record', 'gallery'],
  timeline: ['schedule', 'gallery', 'gallery'],
  'schedule-list': ['schedule', 'schedule'],
  'schedule-create': ['schedule', 'schedule', 'schedule'],
  pet: ['profile', 'profile'],
  'record-edit': ['gallery', 'gallery'],
  'schedule-edit': ['schedule', 'schedule'],
  font: ['font', 'font'],
} satisfies Record<TutorialId, readonly Artwork[]>;

export function getTutorialArtwork(topic: TutorialId, step: number): ImageSourcePropType | undefined {
  const key = tutorialArtworkByStep[topic][step];
  return key ? art[key] : undefined;
}
