// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts
// 목적:
// - LoggedInHome 전용 스타일 (스크린샷 톤)
// - ✅ 오늘날의 기록(슬라이드): 정사각 5:5, 옆 카드 살짝 보임
//   - overlay: 상단 최소 / 하단 그라데이션 강화 + 텍스트는 이미지 위
//   - indicator dot: BRAND 컬러 기반

import { StyleSheet } from 'react-native';
import { SCREEN_TOP_SPACING } from '../../../../theme/layout';
import { typography } from '../../../../app/theme/tokens/typography';

const BRAND = '#6D6AF8';
const BRAND_DEEP = '#5753E6';

const TEXT = '#0B1220';
const MUTED = '#556070';
const MUTED2 = 'rgba(85,96,112,0.70)';

const SURFACE = '#FFFFFF';
const SURFACE_SOFT = '#F6F7FB';

const BORDER_SOFT = 'rgba(0,0,0,0.06)';

const ABS_FILL = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

const BLUE = '#2563EB';
const ORANGE = '#F97316';
const PINK = '#EF4444';
const PURPLE = BRAND_DEEP;
const HOME_SECTION_GAP = 24;

export const styles = StyleSheet.create({
  // ---------------------------------------------------------
  // Layout
  // ---------------------------------------------------------
  screen: { flex: 1, backgroundColor: SURFACE },
  scroll: { flex: 1, backgroundColor: SURFACE },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: SCREEN_TOP_SPACING,
    paddingBottom: 34,
    gap: HOME_SECTION_GAP,
  },
  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  header: {
    position: 'relative',
    marginBottom: 2,
  },
  brandContentStack: {
    width: '100%',
    paddingTop: 8,
    alignItems: 'flex-start',
    gap: 7,
    marginBottom: 16,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  brandWordmark: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: 'Fredoka-SemiBold',
    fontWeight: 'normal',
    letterSpacing: 0,
  },
  brandPaw: {
    marginTop: -2,
    marginLeft: 2,
  },
  notificationAnchor: {
    position: 'absolute',
    top: 5,
    right: 0,
    zIndex: 1,
  },
  seasonalCopyReadabilityText: {
    textShadowColor: 'rgba(255,255,255,0.32)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.5,
  },
  title: { fontSize: 16, fontWeight: '900', color: BRAND_DEEP },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    lineHeight: 16,
  },
  seasonalCopy: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    position: 'relative',
  },
  autumnHeaderIconBtn: {
    backgroundColor: 'rgba(255, 252, 247, 0.97)',
    borderColor: 'rgba(94, 68, 49, 0.34)',
    shadowColor: '#4D3428',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  winterHeaderIconBtn: {
    backgroundColor: 'rgba(248, 251, 255, 0.94)',
    borderColor: 'rgba(120, 148, 210, 0.30)',
    shadowColor: '#40516F',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PINK,
    borderWidth: 2,
    borderColor: SURFACE,
  },
  headerNotificationBadgeText: {
    color: SURFACE,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
  },
  headerIconText: {
    fontSize: 15,
    fontWeight: '900',
    color: 'rgba(11,18,32,0.75)',
    marginTop: -1,
  },

  notificationOverlayRoot: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  notificationOverlayBackdropPressable: {
    ...ABS_FILL,
  },
  notificationOverlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.30)',
  },
  notificationOverlayPanel: {
    marginHorizontal: 18,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(16,32,51,0.08)',
    shadowColor: '#0B1220',
    shadowOpacity: 0.11,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  notificationModalHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  notificationModalTitleWrap: {
    flex: 1,
    gap: 3,
  },
  notificationModalTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 0,
  },
  notificationModalSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: MUTED,
  },
  notificationModalClearAllButton: {
    minHeight: 30,
    borderRadius: 9,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(85,96,112,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(85,96,112,0.10)',
  },
  notificationModalClearAllText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    color: MUTED,
  },
  notificationModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,18,32,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.06)',
  },
  notificationModalState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  notificationModalStateTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    color: TEXT,
    textAlign: 'center',
  },
  notificationModalStateText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
  },
  notificationModalRetryButton: {
    marginTop: 6,
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_DEEP,
  },
  notificationModalRetryText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  notificationModalEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE_SOFT,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  notificationModalList: {
    maxHeight: '100%',
  },
  notificationModalListContent: {
    gap: 6,
    paddingBottom: 3,
  },
  notificationModalSwipeRow: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
  },
  notificationModalSwipeCard: {
    transform: [{ translateX: 0 }],
  },
  notificationModalItem: {
    minHeight: 70,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(16,32,51,0.10)',
  },
  notificationModalItemUnread: {
    backgroundColor: '#F8F9FA',
    borderColor: 'rgba(16,32,51,0.14)',
  },
  notificationModalItemExpanded: {
    minHeight: 92,
  },
  notificationModalItemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  notificationModalItemIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(85,96,112,0.07)',
  },
  notificationModalItemContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  notificationModalItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  notificationModalItemTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  notificationModalItemTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0,
  },
  notificationModalUnreadDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(79,70,229,0.72)',
  },
  notificationModalItemDate: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: 'rgba(85,96,112,0.68)',
    textAlign: 'left',
  },
  notificationModalItemMeta: {
    alignItems: 'flex-end',
    gap: 7,
  },
  notificationModalItemDeleteButton: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,18,32,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.055)',
  },
  notificationModalItemBody: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: MUTED,
  },
  notificationModalItemBodyCollapsed: {
    minHeight: 17,
  },
  notificationModalItemBodyExpanded: {
    color: 'rgba(55,65,81,0.92)',
  },
  notificationModalItemFooterRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationModalExpandButton: {
    width: 26,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'transparent',
  },

  // ---------------------------------------------------------
  // Pet Switcher
  // ---------------------------------------------------------
  petSwitcherRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  petChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: SURFACE_SOFT,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  petChipActive: {
    borderColor: BRAND,
    borderWidth: 2,
    shadowColor: BRAND,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  petChipImage: { width: '100%', height: '100%' },
  petChipPlaceholder: { flex: 1, backgroundColor: 'rgba(109,106,248,0.10)' },

  petAddChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  petAddPlus: {
    color: BRAND_DEEP,
    fontSize: 18,
    fontWeight: '900',
    marginTop: -1,
  },

  // ---------------------------------------------------------
  // Weather Guide
  // ---------------------------------------------------------
  weatherGuideWrap: {
    marginTop: 32,
    marginBottom: 18,
  },

  // ---------------------------------------------------------
  // HERO CARD
  // ---------------------------------------------------------
  heroCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: SURFACE,
  },
  autumnHeroCard: {
    backgroundColor: 'transparent',
    paddingTop: 8,
    paddingBottom: 0,
  },
  winterHeroCard: {
    backgroundColor: 'transparent',
    paddingTop: 8,
    paddingBottom: 0,
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
  heroAvatarPressTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroAvatarPressVisual: {
    marginBottom: 0,
  },
  autumnHeroHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 214, 173, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255, 235, 204, 0.62)',
  },
  winterHeroHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(220, 234, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(248, 251, 255, 0.68)',
  },
  heroAvatarGlow: {
    position: 'absolute',
    width: 154,
    height: 154,
    borderRadius: 999,
    backgroundColor: 'rgba(87,83,230,0.18)',
    shadowColor: BRAND_DEEP,
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
    shadowColor: BRAND_DEEP,
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
  heroAvatarImg: { width: '100%', height: '100%' },
  heroAvatarPlaceholder: { flex: 1, backgroundColor: 'rgba(109,106,248,0.12)' },

  heroName: {
    maxWidth: '88%',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: BRAND_DEEP,
    letterSpacing: 0,
    marginTop: 8,
    textAlign: 'center',
  },
  heroTitleBadge: {
    maxWidth: '82%',
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  heroTitleBadgeText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  heroMetaLine: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: MUTED,
  },
  heroMetaThemeText: {
    maxWidth: '100%',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.90)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  heroMetaMuted: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: 'rgba(85,96,112,0.65)',
  },
  heroTogetherPill: {
    marginTop: 22,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: BRAND_DEEP,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },
  heroTogetherText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  heroTogetherStrong: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroTogetherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTogetherHeart: {
    fontSize: 16,
  },
  autumnProfileEntry: {
    minHeight: 52,
    marginTop: 20,
    position: 'relative',
    paddingHorizontal: 48,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(132, 91, 65, 0.24)',
    backgroundColor: 'rgba(255, 252, 247, 0.20)',
  },
  autumnProfileEntryText: {
    maxWidth: '100%',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: '#5D4333',
    textAlign: 'center',
  },
  autumnProfileEntrySeason: {
    borderColor: 'rgba(124, 46, 32, 0.72)',
    backgroundColor: 'rgba(159, 66, 44, 0.94)',
    shadowColor: '#6E2B20',
    shadowOpacity: 0.16,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  autumnProfileEntrySeasonText: {
    color: '#FFF9F0',
  },
  autumnProfileEntryChevron: {
    position: 'absolute',
    right: 16,
  },
  winterProfileEntry: {
    borderColor: 'rgba(120, 148, 210, 0.30)',
    backgroundColor: '#FFFFFF',
    shadowColor: '#7894D2',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  winterProfileEntryText: {
    color: '#40516F',
    maxWidth: undefined,
    alignSelf: 'center',
    includeFontPadding: false,
    backgroundColor: '#FFFFFF',
  },
  winterProfileEntryPressTarget: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },

  // ---------------------------------------------------------
  // Accordion
  // ---------------------------------------------------------
  accordionWrap: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: SURFACE,
    overflow: 'hidden',
  },
  autumnAccordionWrap: {
    backgroundColor: 'rgba(255, 250, 243, 0.10)',
    borderColor: 'rgba(157, 104, 62, 0.20)',
    shadowOpacity: 0,
    elevation: 0,
  },
  autumnAccordionAllRow: {
    backgroundColor: 'rgba(255, 250, 243, 0.42)',
    borderBottomColor: 'rgba(132, 91, 65, 0.12)',
  },
  autumnAccordionItem: {
    backgroundColor: 'rgba(255, 250, 243, 0.42)',
    borderBottomColor: 'rgba(132, 91, 65, 0.12)',
  },

  accordionAllRow: {
    height: 38,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  accordionAllLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: BRAND,
  },
  accordionAllIcon: {
    fontSize: 14,
    fontWeight: '900',
    color: 'rgba(11,18,32,0.45)',
    marginTop: -1,
  },

  accordionItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  accordionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  accordionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleBlue: { backgroundColor: 'rgba(37,99,235,0.10)' },
  iconCircleOrange: { backgroundColor: 'rgba(249,115,22,0.12)' },
  iconCirclePink: { backgroundColor: 'rgba(239,68,68,0.10)' },
  iconCirclePurple: { backgroundColor: 'rgba(109,106,248,0.10)' },

  accordionIconText: { fontSize: 16, fontWeight: '900', color: TEXT },

  accordionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
    letterSpacing: 0.8,
    lineHeight: 18,
  },

  accTitleBlue: { color: BLUE },
  accTitleOrange: { color: ORANGE },
  accTitlePink: { color: PINK },
  accTitlePurple: { color: PURPLE },

  accordionChevron: {
    fontSize: 16,
    fontWeight: '900',
    color: 'rgba(11,18,32,0.35)',
    marginTop: -2,
  },

  accordionBody: { marginTop: 10, gap: 8, paddingLeft: 44 },
  accordionBullet: { fontSize: 13, fontWeight: '800', color: MUTED },
  accordionEmpty: { fontSize: 13, fontWeight: '800', color: MUTED2 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tagText: { fontSize: 12, fontWeight: '900', color: BRAND_DEEP },

  profileSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  profileSheetBackdropPressable: {
    ...ABS_FILL,
  },
  profileSheetBackdrop: {
    ...ABS_FILL,
    backgroundColor: 'rgba(33, 22, 17, 0.28)',
  },
  profileSheet: {
    maxHeight: '82%',
    paddingTop: 10,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFF9F1',
    borderWidth: 1,
    borderColor: 'rgba(157, 104, 62, 0.18)',
    shadowColor: '#6B432A',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
    overflow: 'hidden',
  },
  winterProfileSheet: {
    backgroundColor: '#F4F8FF',
    borderColor: 'rgba(120, 148, 210, 0.22)',
    shadowColor: '#40516F',
  },
  springProfileSheet: {
    backgroundColor: '#F8FBFF',
    borderColor: 'rgba(217, 79, 122, 0.18)',
    shadowColor: '#9F6A82',
  },
  summerProfileSheet: {
    backgroundColor: '#F4FBFF',
    borderColor: 'rgba(37, 112, 95, 0.18)',
    shadowColor: '#4F8479',
  },
  profileSheetBackgroundLayer: {
    ...ABS_FILL,
  },
  profileSheetBackgroundBase: {
    ...ABS_FILL,
  },
  profileSheetBottomWave: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: 116,
  },
  winterProfileSheetBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  profileSheetFrameOrnaments: {
    ...ABS_FILL,
  },
  profileSheetOrnamentLeft: {
    position: 'absolute',
    top: 2,
    left: 4,
    opacity: 0.7,
    transform: [{ scale: 0.82 }, { rotate: '-12deg' }],
  },
  profileSheetOrnamentLeftTrail: {
    position: 'absolute',
    top: 1,
    left: 54,
    opacity: 0.46,
    transform: [{ scale: 0.42 }, { rotate: '24deg' }],
  },
  profileSheetOrnamentRight: {
    position: 'absolute',
    top: 2,
    right: 4,
    opacity: 0.66,
    transform: [{ scale: 0.7 }, { rotate: '72deg' }],
  },
  profileSheetOrnamentRightTrail: {
    position: 'absolute',
    top: 3,
    right: 58,
    opacity: 0.44,
    transform: [{ scale: 0.38 }, { rotate: '118deg' }],
  },
  profileSheetFallingLeafLeftUpper: {
    position: 'absolute',
    top: 92,
    left: -3,
    opacity: 0.46,
    transform: [{ scale: 0.48 }, { rotate: '18deg' }],
  },
  profileSheetFallingLeafRightUpper: {
    position: 'absolute',
    top: 142,
    right: -4,
    opacity: 0.38,
    transform: [{ scale: 0.35 }, { rotate: '106deg' }],
  },
  profileSheetFallingLeafLeftMiddle: {
    position: 'absolute',
    top: 232,
    left: 5,
    opacity: 0.36,
    transform: [{ scale: 0.32 }, { rotate: '-42deg' }],
  },
  profileSheetFallingLeafRightMiddle: {
    position: 'absolute',
    top: 304,
    right: 3,
    opacity: 0.46,
    transform: [{ scale: 0.5 }, { rotate: '148deg' }],
  },
  profileSheetFallingLeafLeftLower: {
    position: 'absolute',
    top: 392,
    left: -2,
    opacity: 0.4,
    transform: [{ scale: 0.4 }, { rotate: '72deg' }],
  },
  profileSheetFallingLeafRightLower: {
    position: 'absolute',
    top: 456,
    right: 4,
    opacity: 0.46,
    transform: [{ scale: 0.58 }, { rotate: '-18deg' }],
  },
  profileSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(93, 67, 51, 0.22)',
  },
  winterProfileSheetHandle: {
    backgroundColor: 'rgba(64, 81, 111, 0.22)',
  },
  springProfileSheetHandle: {
    backgroundColor: 'rgba(143, 91, 116, 0.22)',
  },
  summerProfileSheetHandle: {
    backgroundColor: 'rgba(62, 111, 104, 0.22)',
  },
  profileSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  profileSheetHeaderIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  profileSheetThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(157, 104, 62, 0.28)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    shadowColor: '#8B5C3D',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  profileSheetThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  profileSheetTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileSheetTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: '#4F382A',
    flexShrink: 1,
  },
  winterProfileSheetTitle: {
    color: '#40516F',
  },
  springProfileSheetTitle: {
    color: '#604957',
  },
  summerProfileSheetTitle: {
    color: '#385B56',
  },
  profileSheetSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: '#806958',
  },
  winterProfileSheetSubtitle: {
    color: '#677792',
  },
  springProfileSheetSubtitle: {
    color: '#7B6672',
  },
  summerProfileSheetSubtitle: {
    color: '#607A75',
  },
  profileSheetCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,251,245,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(132, 91, 65, 0.20)',
    shadowColor: '#6B432A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  winterProfileSheetCloseButton: {
    backgroundColor: 'rgba(248, 251, 255, 0.92)',
    borderColor: 'rgba(120, 148, 210, 0.25)',
    shadowColor: '#40516F',
  },
  springProfileSheetCloseButton: {
    backgroundColor: 'rgba(255, 252, 254, 0.92)',
    borderColor: 'rgba(217, 79, 122, 0.20)',
    shadowColor: '#9F6A82',
  },
  summerProfileSheetCloseButton: {
    backgroundColor: 'rgba(252, 255, 254, 0.92)',
    borderColor: 'rgba(37, 112, 95, 0.20)',
    shadowColor: '#4F8479',
  },
  profileSheetScroll: {
    minHeight: 0,
    flexShrink: 1,
  },
  profileSheetScrollContent: {
    paddingTop: 2,
  },
  profileSheetRows: {
    gap: 9,
  },
  profileSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingLeft: 14,
    paddingRight: 54,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: '#FFFCF7',
    borderWidth: 1,
    borderColor: 'rgba(180,135,101,0.14)',
  },
  winterProfileSheetRow: {
    backgroundColor: 'rgba(251, 253, 255, 0.90)',
    borderColor: 'rgba(120, 148, 210, 0.16)',
  },
  springProfileSheetRow: {
    backgroundColor: 'rgba(255, 254, 253, 0.91)',
    borderColor: 'rgba(217, 79, 122, 0.13)',
  },
  summerProfileSheetRow: {
    backgroundColor: 'rgba(253, 255, 253, 0.91)',
    borderColor: 'rgba(37, 112, 95, 0.13)',
  },
  profileSheetRowOrnament: {
    position: 'absolute',
    right: 13,
    top: '50%',
    marginTop: -16,
  },
  profileSheetRowOrnamentHobby: {
    opacity: 0.38,
    transform: [{ scale: 0.72 }, { rotate: '-14deg' }],
  },
  profileSheetRowOrnamentLike: {
    opacity: 0.42,
    transform: [{ scale: 0.82 }, { rotate: '18deg' }],
  },
  profileSheetRowOrnamentDislike: {
    opacity: 0.34,
    transform: [{ scale: 0.58 }, { rotate: '42deg' }],
  },
  profileSheetRowOrnamentTag: {
    opacity: 0.4,
    transform: [{ scale: 0.76 }, { rotate: '-24deg' }],
  },
  profileSheetIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileSheetCategoryEmoji: {
    fontSize: 13,
    lineHeight: 18,
  },
  profileSheetRowContent: {
    flex: 1,
    minWidth: 0,
  },
  profileSheetCategoryLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 0,
  },
  profileSheetRowLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    flexShrink: 0,
  },
  profileSheetRowDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    color: '#806958',
    flexShrink: 1,
  },
  winterProfileSheetRowDescription: {
    color: '#677792',
  },
  springProfileSheetRowDescription: {
    color: '#7B6672',
  },
  summerProfileSheetRowDescription: {
    color: '#607A75',
  },
  profileSheetValueWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
    paddingLeft: 0,
  },
  profileSheetValueChip: {
    maxWidth: '100%',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 250, 243, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(157, 104, 62, 0.12)',
  },
  profileSheetValueChipText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '500',
    color: '#675449',
  },
  profileSheetValueChipBlue: {
    backgroundColor: 'rgba(226, 236, 255, 0.94)',
    borderColor: 'rgba(61, 115, 217, 0.14)',
  },
  profileSheetValueChipTextBlue: { color: '#2F61B9' },
  profileSheetValueChipOrange: {
    backgroundColor: 'rgba(255, 239, 204, 0.94)',
    borderColor: 'rgba(227, 138, 24, 0.16)',
  },
  profileSheetValueChipTextOrange: { color: '#C26B0A' },
  profileSheetValueChipPink: {
    backgroundColor: 'rgba(255, 231, 235, 0.94)',
    borderColor: 'rgba(224, 106, 118, 0.16)',
  },
  profileSheetValueChipTextPink: { color: '#C64E5B' },
  profileSheetValueChipPurple: {
    backgroundColor: 'rgba(239, 232, 255, 0.94)',
    borderColor: 'rgba(115, 88, 199, 0.16)',
  },
  profileSheetValueChipTextPurple: { color: '#6046AE' },
  profileSheetEmptyValue: {
    marginTop: 8,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    color: '#927D6B',
  },
  winterProfileSheetEmptyValue: {
    color: '#75839B',
  },
  springProfileSheetEmptyValue: {
    color: '#8C7480',
  },
  summerProfileSheetEmptyValue: {
    color: '#6E8580',
  },
  profileSheetFooter: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 0,
  },
  profileSheetFooterCopy: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    color: '#B66B31',
  },
  winterProfileSheetFooterCopy: {
    color: '#6F78B8',
  },
  springProfileSheetFooterCopy: {
    color: '#C4688D',
  },
  summerProfileSheetFooterCopy: {
    color: '#3F8172',
  },

  // ---------------------------------------------------------
  // Today Message
  // ---------------------------------------------------------
  heroMessageBox: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11,18,32,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'visible',
  },
  heroMessageBottomShadow: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: -4,
    height: 8,
    borderRadius: 999,

    shadowOffset: { width: 0, height: 4 },
  },
  heroMessageIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMessageIconText: { fontSize: 20, lineHeight: 24 },
  heroMessageText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: TEXT,
    lineHeight: 18,
  },

  // ---------------------------------------------------------
  // Section Lead
  // ---------------------------------------------------------
  sectionLead: {
    height: 0,
    marginTop: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  sectionLeadTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: BRAND_DEEP,
  },
  sectionLeadSub: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: MUTED,
  },

  // ---------------------------------------------------------
  // Sections
  // ---------------------------------------------------------
  section: {
    gap: 20,
    marginTop: 0,
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  todayPhotoSection: {
    marginTop: 0,
    paddingTop: 20,
  },
  recentSection: {
    gap: 10,
    paddingHorizontal: 14,
  },
  recentSectionHeaderRow: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 10,
  },
  recentSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionHeaderCol: {
    gap: 4,
  },
  quickSectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: BRAND_DEEP,
  },
  sectionTitle: {
    ...typography.unified.title,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: BRAND_DEEP,
  },
  sectionSubText: {
    fontSize: 13,
    fontWeight: '400',
    color: MUTED,
    lineHeight: 18,
  },
  sectionLink: {
    ...typography.unified.body,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: BRAND_DEEP,
  },

  // ---------------------------------------------------------
  // Today Photo Card
  // ---------------------------------------------------------
  photoCard: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: SURFACE_SOFT,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  photoImage: { width: '100%', height: '100%', position: 'absolute' },
  photoPlaceholder: { flex: 1, backgroundColor: 'rgba(0,0,0,0.06)' },

  photoOverlayTint: {
    ...ABS_FILL,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  photoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 12,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  photoOverlayTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  photoOverlaySub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    marginTop: 6,
  },
  photoOverlayDate: {
    color: 'rgba(255,255,255,0.96)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },

  // ---------------------------------------------------------
  // Recent Records Preview
  // ---------------------------------------------------------
  recentPreviewWrap: {
    marginTop: 0,
  },
  recentPreviewBorder: {
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.09)',
  },
  recentPreviewCard: {
    borderRadius: 15,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: SURFACE,
    borderWidth: 0,
    overflow: 'hidden',
  },
  recentPreviewList: {
    gap: 0,
  },
  recentRecordRow: {
    position: 'relative',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recentRecordDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  recentRecordIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentRecordBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },
  recentRecordCategory: {
    ...typography.unified.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    color: TEXT,
  },
  recentRecordSummary: {
    ...typography.unified.body,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: MUTED,
  },
  recentRecordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 76,
  },
  recentRecordTime: {
    ...typography.unified.body,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: MUTED,
    textAlign: 'right',
  },
  recentEmptyDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  recentEmptyState: {
    minHeight: 132,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  // ---------------------------------------------------------
  // Weekly Summary
  // ---------------------------------------------------------
  weeklySummarySection: {
    marginTop: 0,
  },
  weeklySummaryBorder: {
    borderRadius: 29.25,
    borderWidth: 1,
    padding: 0,
  },
  weeklySummaryCard: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    gap: 14,
    shadowColor: '#2C1654',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  weeklySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weeklySummaryHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3EDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklySummaryHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  weeklySummaryTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  weeklySummarySubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: '#7B748E',
  },
  weeklySummaryGrid: {
    gap: 12,
  },
  weeklySummaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weeklySummaryMetricCard: {
    flex: 1,
    height: 144,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3EFF8',
    shadowColor: '#2C1654',
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  weeklySummaryMetricTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  weeklySummaryMetricIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklySummaryChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9FD',
    borderWidth: 1,
    borderColor: '#F1EDF7',
  },
  weeklySummaryMetricLabel: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#26213B',
  },
  weeklySummaryMetricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  weeklySummaryMetricValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0,
  },
  weeklySummaryMetricUnit: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  weeklySummaryInsight: {
    minHeight: 76,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FBF9FF',
    borderWidth: 1,
    borderColor: '#F1ECFA',
  },
  weeklySummaryInsightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1E9FF',
  },
  weeklySummaryInsightText: {
    flex: 1,
    minWidth: 0,
  },
  weeklySummaryInsightTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#211B35',
  },
  weeklySummaryInsightBody: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: '#6F6882',
  },
  weeklySummaryFooterDivider: {
    height: 1,
    backgroundColor: '#F1EDF7',
  },
  weeklySummaryFooter: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklySummaryFooterItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  weeklySummaryFooterDividerVertical: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
    backgroundColor: '#F1EDF7',
  },
  weeklySummaryFooterText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: '#6F6882',
  },
  weeklySummaryFooterValue: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ---------------------------------------------------------
  // Recommendation Tips
  // ---------------------------------------------------------
  tipSectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: BRAND_DEEP,
    letterSpacing: 0,
  },
  tipSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  guideDebugBadge: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideDebugBadgeRemote: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  guideDebugBadgeSeed: {
    backgroundColor: 'rgba(245,158,11,0.14)',
  },
  guideDebugBadgeEmpty: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  guideDebugBadgeText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: TEXT,
  },
  tipList: {
    gap: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: SURFACE,
    borderWidth: 0,
  },
  tipThumb: {
    width: 60,
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  tipThumbInner: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.12)',
  },
  tipContent: {
    flex: 1,
    gap: 3,
  },
  tipEyebrow: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: BRAND,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT,
    lineHeight: 21,
    letterSpacing: 0,
  },
  tipDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: MUTED,
    lineHeight: 20,
  },

  // ---------------------------------------------------------
  // Weekly Schedule
  // ---------------------------------------------------------
  scheduleList: {
    gap: 10,
  },
  scheduleCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 10,
  },
  scheduleDateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.08)',
  },
  scheduleDateText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: MUTED,
  },
  scheduleBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,106,248,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.14)',
  },
  scheduleTextCol: {
    flex: 1,
    gap: 3,
  },
  scheduleTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: TEXT,
    letterSpacing: 0,
  },
  scheduleSub: {
    fontSize: 13,
    fontWeight: '400',
    color: MUTED,
    lineHeight: 18,
  },

  // ---------------------------------------------------------
  // Recent Activity
  // ---------------------------------------------------------
  activityList: {
    gap: 10,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  activityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextCol: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: TEXT,
    letterSpacing: 0,
  },
  activitySub: {
    fontSize: 13,
    fontWeight: '400',
    color: MUTED,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(85,96,112,0.68)',
  },

  // ---------------------------------------------------------
  // Home Tip
  // ---------------------------------------------------------
  todayTipCard: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(109,106,248,0.09)',
    gap: 10,
  },
  todayTipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayTipBadgeText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: BRAND,
  },
  todayTipTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: TEXT,
    letterSpacing: 0,
  },
  todayTipDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: MUTED,
    lineHeight: 20,
  },

  // ---------------------------------------------------------
  // Monthly Diary
  // ---------------------------------------------------------
  monthDiaryList: {
    paddingRight: 4,
    gap: 12,
  },
  monthDiaryCard: {
    width: 112,
    gap: 8,
  },
  monthDiaryCover: {
    width: 112,
    height: 112,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E6DED2',
  },
  monthDiaryImage: {
    width: '100%',
    height: '100%',
  },
  monthDiaryFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECE7DE',
  },
  monthDiaryTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: TEXT,
  },
  monthDiaryMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: 'rgba(85,96,112,0.68)',
  },

  // ---------------------------------------------------------
  // CTA Button / Empty Box
  // ---------------------------------------------------------
  recordBtn: {
    height: 46,
    width: '100%',
    borderRadius: 12,
    backgroundColor: BRAND_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: BRAND_DEEP,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  recordBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  emptyBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: SURFACE,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: TEXT,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: MUTED,
    lineHeight: 18,
  },
});
