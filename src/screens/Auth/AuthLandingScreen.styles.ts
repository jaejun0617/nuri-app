// 파일: src/screens/Auth/AuthLandingScreen.styles.ts

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    paddingHorizontal: 18,
    justifyContent: 'center',
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
    marginBottom: 16,
    fontWeight: '600',
  },
  primaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: '#3A3531',
    fontSize: 15,
    fontWeight: '900',
  },
  ghostButton: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 13,
    color: '#7A726C',
    fontWeight: '800',
  },
});
