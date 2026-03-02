// 파일: src/screens/Auth/NicknameSetupScreen.styles.ts

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
    fontSize: 20,
    fontWeight: '900',
    color: authTheme.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },

  subTitle: {
    fontSize: 13,
    color: authTheme.subText,
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: '700',
  },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: authTheme.subText,
    marginBottom: 6,
  },

  input: {
    height: 46,
    borderRadius: authTheme.radiusInput,
    backgroundColor: authTheme.inputBg,
    paddingHorizontal: 12,
    color: authTheme.text,
    fontWeight: '800',
  },

  primaryButton: {
    height: 48,
    borderRadius: authTheme.radiusBtn,
    backgroundColor: authTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  hint: {
    marginTop: 10,
    fontSize: 12,
    color: '#7A726C',
    fontWeight: '700',
    lineHeight: 16,
  },
});
