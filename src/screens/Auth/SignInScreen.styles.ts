import { StyleSheet } from 'react-native';

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
  hero: {
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 38,
  },
  heroLogoWrap: {
    width: 82,
    height: 82,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: {
    width: 118,
    height: 118,
  },
  heroTitle: {
    marginTop: 18,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '900',
    color: TEXT,
  },
  heroBody: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: '#000000',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    display: 'none',
  },
  inputRow: {
    height: 56,
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
    fontSize: 15,
    fontWeight: '700',
  },
  inputAccessory: {
    marginLeft: 12,
  },
  primaryButton: {
    marginTop: 10,
    height: 56,
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
    fontSize: 16,
    fontWeight: '900',
  },
  inlineLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  inlineLinkText: {
    color: '#7D8798',
    fontSize: 12,
    fontWeight: '800',
  },
  inlineDivider: {
    color: '#C8D0DC',
    fontSize: 12,
    fontWeight: '700',
  },
  socialSection: {
    marginTop: 58,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socialDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E7ECF4',
  },
  socialSectionTitle: {
    color: '#AAB3C1',
    fontSize: 12,
    fontWeight: '800',
  },
  socialButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  socialBadge: {
    position: 'absolute',
    left: 18,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  kakaoBadge: {
    width: 18,
    height: 15,
    borderRadius: 6,
    backgroundColor: '#3A2800',
  },
  googleBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    color: '#4285F4',
    fontSize: 12,
    fontWeight: '900',
  },
});
