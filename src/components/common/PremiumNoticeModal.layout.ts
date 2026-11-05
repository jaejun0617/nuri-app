import type { TextStyle, ViewStyle } from 'react-native';

export const PREMIUM_NOTICE_RADIUS = 28;

export const premiumNoticeCardLayout = {
  width: '100%',
  maxWidth: 440,
  alignSelf: 'center',
  borderRadius: PREMIUM_NOTICE_RADIUS,
  borderWidth: 1,
  paddingHorizontal: 24,
  paddingTop: 22,
  paddingBottom: 24,
  alignItems: 'center',
} satisfies ViewStyle;

export const premiumNoticeTitle = {
  textAlign: 'center',
  fontWeight: '800',
  fontSize: 20,
  lineHeight: 29,
} satisfies TextStyle;

export const premiumNoticeBody = {
  textAlign: 'center',
  fontWeight: '600',
  fontSize: 15,
  lineHeight: 22,
} satisfies TextStyle;
