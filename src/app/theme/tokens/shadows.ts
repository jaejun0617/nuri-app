// 파일: src/app/theme/tokens/shadows.ts
// RN은 box-shadow가 플랫폼별로 다르기 때문에 "필요할 때만" 사용 권장.
// iOS: shadow*, Android: elevation
export const shadows = {
  sm: {
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
    android: { elevation: 2 },
  },
  md: {
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 4 },
  },
} as const;
