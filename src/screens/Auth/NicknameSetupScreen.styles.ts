import { StyleSheet } from 'react-native';

const BRAND = '#8B6CF5';
const TEXT = '#3F302D';
const CUTE_FONT = 'insungitCutelivelyjisu';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF4ED',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: undefined,
    height: undefined,
  },
  readabilityVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255, 250, 246, 0.05)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  heroCopy: {
    width: 174,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  wordmark: {
    color: '#EE8177',
    fontFamily: 'Fredoka-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  wordmarkSymbol: {
    width: 19,
    height: 17,
  },
  heroTitle: {
    color: TEXT,
    fontFamily: CUTE_FONT,
    fontSize: 35,
    lineHeight: 43,
  },
  heroSubtitle: {
    marginTop: 10,
    color: '#665B57',
    fontFamily: CUTE_FONT,
    fontSize: 17,
    lineHeight: 27,
  },
  heroDivider: {
    width: 18,
    height: 3,
    marginTop: 18,
    borderRadius: 2,
    backgroundColor: '#F2A08F',
  },
  heroSupportBlock: {
    marginTop: 16,
    gap: 2,
  },
  heroSupportLastLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroSupportText: {
    color: '#665B57',
    fontFamily: CUTE_FONT,
    fontSize: 14,
    lineHeight: 22,
  },
  heroSupportHeart: {
    color: '#EF7F78',
    fontFamily: CUTE_FONT,
    fontSize: 16,
    lineHeight: 22,
  },
  inputBlock: {
    width: '100%',
    gap: 8,
    marginTop: 42,
  },
  inputRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  inputSurface: {
    flex: 1,
    height: 45,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(109, 79, 70, 0.14)',
    backgroundColor: 'rgba(255, 253, 249, 0.76)',
    justifyContent: 'center',
  },
  inputSurfaceFocused: {
    borderColor: 'rgba(139, 108, 245, 0.64)',
    backgroundColor: 'rgba(255, 253, 250, 0.92)',
  },
  input: {
    width: '100%',
    height: 45,
    color: TEXT,
    fontFamily: CUTE_FONT,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 13,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  checkButton: {
    height: 45,
    minWidth: 78,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonEnabled: {
    borderColor: 'rgba(139, 108, 245, 0.20)',
    backgroundColor: 'rgba(238, 231, 255, 0.92)',
  },
  checkButtonDisabled: {
    borderColor: 'rgba(139, 108, 245, 0.10)',
    backgroundColor: 'rgba(238, 231, 255, 0.54)',
  },
  checkButtonText: {
    color: BRAND,
    fontFamily: CUTE_FONT,
    fontSize: 15,
    lineHeight: 20,
  },
  feedbackRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 253, 249, 0.46)',
  },
  feedbackRowError: {
    backgroundColor: 'rgba(255, 238, 238, 0.72)',
  },
  feedbackRowSuccess: {
    backgroundColor: 'rgba(236, 249, 239, 0.76)',
  },
  feedbackText: {
    flexShrink: 1,
    color: '#776A65',
    fontFamily: CUTE_FONT,
    fontSize: 14,
    lineHeight: 19,
  },
  validationError: {
    color: '#C84F58',
  },
  validationSuccess: {
    color: '#408B5B',
  },
  actionZone: {
    paddingHorizontal: 22,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  footerInner: {
    width: '100%',
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    backgroundColor: 'rgba(146, 207, 138, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#6EAA68',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(146, 207, 138, 0.42)',
    borderColor: 'rgba(255, 255, 255, 0.34)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: CUTE_FONT,
    fontSize: 18,
    lineHeight: 23,
  },
  primaryButtonArrow: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
