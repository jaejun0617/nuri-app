// 파일: src/screens/Auth/NicknameSetupScreen.styles.ts

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1D1B19',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 13,
    color: '#6E6660',
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E6660',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3EEE8',
    paddingHorizontal: 12,
    color: '#1D1B19',
    fontWeight: '700',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#B00020',
    fontWeight: '800',
    marginBottom: 10,
  },
  primaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  ghostButton: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ghostButtonText: {
    fontSize: 13,
    color: '#7A726C',
    fontWeight: '800',
  },
});
