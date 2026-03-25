import { StyleSheet } from 'react-native';
import { typography } from '../../app/theme/tokens/typography';

const BRAND = '#6D6AF8';
const TEXT = '#1B2230';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topRightBadge: {
    position: 'absolute',
    top: 54,
    right: 22,
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 50,
    paddingTop: 88,
  },
  title: {
    color: TEXT,
    ...typography.role.titleLg,
    fontWeight: '800',
  },
  logo: {
    width: 200,
    height: 200,
    marginTop: 0,
    marginBottom: 64,
    opacity: 0.82,
  },
  inputBlock: {
    width: '100%',
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: TEXT,
    ...typography.role.body,
    fontWeight: '700',
    paddingVertical: 6,
  },
  checkButton: {
    minWidth: 72,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonDisabled: {
    opacity: 0.48,
  },
  checkButtonText: {
    color: BRAND,
    ...typography.role.tab,
    fontWeight: '800',
  },
  underline: {
    height: 1,
    backgroundColor: '#000004',
  },
  hintText: {
    color: '#A1A9B8',
    ...typography.role.helper,
    fontWeight: '700',
    textAlign: 'center',
  },
  validationText: {
    ...typography.role.helper,
    fontWeight: '800',
    textAlign: 'center',
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkingText: {
    color: '#98A1B2',
    ...typography.role.helper,
    fontWeight: '700',
  },
  validationError: {
    color: '#F04452',
  },
  validationSuccess: {
    color: '#4EC9A2',
  },
  footer: {
    paddingHorizontal: 26,
    paddingBottom: 34,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(109,106,248,0.34)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    ...typography.role.button,
    fontWeight: '900',
  },
});
