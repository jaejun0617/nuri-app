import { StyleSheet } from 'react-native';
import { typography } from '../../../../app/theme/tokens/typography';
import { SCREEN_TOP_SPACING } from '../../../../theme/layout';

const TEXT = '#0B1220';
const MUTED = '#556070';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: SCREEN_TOP_SPACING,
    gap: 22,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextArea: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  title: {
    ...typography.role.titleMd,
    fontWeight: '800',
  },
  subTitle: {
    ...typography.role.helper,
    lineHeight: 18,
    fontWeight: '700',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(109,124,255,0.14)',
  },
  petSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  petChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7FB',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  petChipActive: {
    borderWidth: 2,
    shadowColor: '#6D7CFF',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  petChipLogo: {
    width: 32,
    height: 32,
  },
  petAddChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
  },
  petAddPlus: {
    fontWeight: '900',
    marginTop: -2,
  },

  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  heroCenter: {
    alignItems: 'center',
    paddingTop: 10,
    gap: 6,
  },
  heroAvatarOuter: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroAvatarGlow: {
    position: 'absolute',
    width: 154,
    height: 154,
    borderRadius: 999,
    shadowOpacity: 0.22,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 9,
  },
  heroAvatarRing: {
    width: 144,
    height: 144,
    borderRadius: 999,
    padding: 6,
    shadowColor: '#5753E6',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  heroAvatarRingInner: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  heroAvatarWrap: {
    width: 132,
    height: 132,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.96)',
    backgroundColor: 'rgba(87,83,230,0.08)',
  },
  heroAvatarImg: {
    width: '100%',
    height: '100%',
  },
  heroName: {
    ...typography.role.titleLg,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroMetaLine: {
    ...typography.role.bodySm,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroMetaMuted: {
    ...typography.role.helper,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 8,
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  heroTogetherPill: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },
  heroTogetherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTogetherText: {
    color: '#FFFFFF',
    ...typography.role.helper,
    fontWeight: '800',
  },
  heroTogetherHeart: {
    color: '#FFFFFF',
    ...typography.role.helper,
    fontWeight: '800',
  },

  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.role.titleMd,
    fontWeight: '800',
  },
  sectionSubTitle: {
    ...typography.role.helper,
    lineHeight: 18,
    fontWeight: '700',
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '48%',
    minHeight: 116,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  quickIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  quickLabel: {
    fontWeight: '800',
    lineHeight: 22,
  },

  photoCard: {
    height: 238,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F6F7FB',
  },
  photoCardImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  photoTextWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 4,
  },
  photoEyebrow: {
    color: 'rgba(255,255,255,0.84)',
    ...typography.role.helper,
    fontWeight: '800',
  },
  photoTitle: {
    color: '#FFFFFF',
    ...typography.role.body,
    fontWeight: '800',
  },
  photoBody: {
    color: 'rgba(255,255,255,0.82)',
    ...typography.role.helper,
    fontWeight: '700',
  },

  featureGrid: {
    gap: 12,
  },
  featureCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  featureTitle: {
    fontWeight: '800',
  },
  featureBody: {
    fontWeight: '600',
    lineHeight: 20,
  },

  flowList: {
    gap: 12,
  },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  flowIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  flowCopy: {
    flex: 1,
    gap: 4,
  },
  flowLabel: {
    color: TEXT,
    fontWeight: '800',
  },
  flowDescription: {
    color: MUTED,
    fontWeight: '600',
    lineHeight: 20,
  },

  activityList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  activityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,124,255,0.08)',
  },
  activityTextCol: {
    flex: 1,
    gap: 4,
  },
  activityTitle: {
    fontWeight: '700',
  },
  activitySub: {
    fontWeight: '700',
    lineHeight: 18,
  },
  activityTime: {
    fontWeight: '700',
  },
});
