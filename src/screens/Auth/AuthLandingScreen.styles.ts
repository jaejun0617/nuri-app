// 파일: src/screens/Auth/AuthLandingScreen.styles.ts

import { StyleSheet } from 'react-native';
import { authTheme } from './_shared/authTheme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: authTheme.bg,
    paddingHorizontal: 18,
    paddingTop: 18,
    justifyContent: 'center',
  },

  card: {
    backgroundColor: authTheme.cardBg,
    borderRadius: authTheme.radiusCard,
    padding: 18,
    borderWidth: 1,
    borderColor: authTheme.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: authTheme.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },

  subTitle: {
    fontSize: 13,
    color: authTheme.subText,
    fontWeight: '700',
    lineHeight: 18,
  },

  spacer: { height: 18 },

  primaryButton: {
    height: 48,
    borderRadius: authTheme.radiusBtn,
    backgroundColor: authTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  secondaryButton: {
    marginTop: 10,
    height: 48,
    borderRadius: authTheme.radiusBtn,
    backgroundColor: authTheme.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: authTheme.text,
    fontSize: 15,
    fontWeight: '900',
  },

  ghostButton: {
    marginTop: 12,
    height: 44,
    borderRadius: authTheme.radiusBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 13,
    color: '#7A726C',
    fontWeight: '800',
  },
});
