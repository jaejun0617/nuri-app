import { StyleSheet } from 'react-native';
import { typography } from '../../app/theme/tokens/typography';

const TEXT = '#1B2435';
const BRAND = '#6D6AF8';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    marginTop: 28,
    marginBottom: 28,
  },
  heroEyebrow: {
    color: BRAND,
    ...typography.role.tab,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: 10,
    color: TEXT,
    ...typography.role.titleLg,
    fontWeight: '800',
  },
  heroBody: {
    marginTop: 12,
    color: '#5E6B82',
    ...typography.role.body,
    fontWeight: '600',
  },
  banner: {
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFF4EC',
    borderWidth: 1,
    borderColor: '#FFD7BF',
  },
  bannerText: {
    color: '#8A4B16',
    ...typography.role.helper,
    fontWeight: '700',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    color: TEXT,
    ...typography.role.helper,
    fontWeight: '700',
  },
  inputRow: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#EDF1F7',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: TEXT,
    ...typography.role.body,
    fontWeight: '700',
  },
  helperText: {
    marginTop: 10,
    color: '#7D8798',
    ...typography.role.helper,
    fontWeight: '700',
  },
  successBox: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F5F8FF',
    borderWidth: 1,
    borderColor: '#DEE7FF',
  },
  successTitle: {
    color: '#31456A',
    ...typography.role.bodySm,
    fontWeight: '900',
  },
  successBody: {
    marginTop: 8,
    color: '#51627F',
    ...typography.role.helper,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    ...typography.role.button,
    fontWeight: '900',
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E9F2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#5C6A7F',
    ...typography.role.button,
    fontWeight: '900',
  },
  processingCard: {
    marginTop: 40,
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#EDF1F7',
    alignItems: 'center',
  },
  processingTitle: {
    marginTop: 16,
    color: TEXT,
    ...typography.role.titleMd,
    fontWeight: '800',
    textAlign: 'center',
  },
  processingBody: {
    marginTop: 8,
    color: '#66748B',
    ...typography.role.bodySm,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerAction: {
    marginTop: 'auto',
    paddingTop: 24,
  },
});
