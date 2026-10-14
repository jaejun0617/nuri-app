import { StyleSheet } from 'react-native';
import type { MapStyleElement } from 'react-native-maps';

export const WALK_SHEET_OVERLAP = 28;

// Local presentation scale: compact text, unchanged font preference and scaling.
export const WALK_TEXT = StyleSheet.create({
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: 0 },
  state: { fontSize: 16, lineHeight: 22, fontWeight: '600', letterSpacing: 0 },
  body: { fontSize: 13, lineHeight: 19, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 18, letterSpacing: 0 },
  metric: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0 },
  action: { fontSize: 15, lineHeight: 21, fontWeight: '600', letterSpacing: 0 },
});

// Neutral map structure; only the route and pet ring receive seasonal accents.
export const WALK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#25333F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#E4EAF0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#25333F' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#465563' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1A2833' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#29443E' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#19394B' }],
  },
];
