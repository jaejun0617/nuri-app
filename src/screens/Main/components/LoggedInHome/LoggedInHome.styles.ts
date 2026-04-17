// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts
// 목적:
// - LoggedInHome 전용 스타일 (스크린샷 톤)
// - ✅ 오늘날의 기록(슬라이드): 정사각 5:5, 옆 카드 살짝 보임
//   - overlay: 상단 최소 / 하단 그라데이션 강화 + 텍스트는 이미지 위
//   - indicator dot: BRAND 컬러 기반

import { StyleSheet } from 'react-native';
import { SCREEN_TOP_SPACING } from '../../../../theme/layout';

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
    gap: 18,
  },
  topButtonWrap: {
    position: 'absolute',
    right: 20,
    zIndex: 8,
    elevation: 8,
  },
  topButton: {
    width: 48,
    height: 48,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  header: {
    gap: 12,
    marginBottom: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextArea: { gap: 4, paddingTop: 2, flex: 1 },
  title: { fontSize: 16, fontWeight: '900', color: BRAND_DEEP },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    lineHeight: 16,
  },

  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  headerIconText: {
    fontSize: 15,
    fontWeight: '900',
    color: 'rgba(11,18,32,0.75)',
    marginTop: -1,
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
    marginBottom: 2,
  },

  // ---------------------------------------------------------
  // HERO CARD
  // ---------------------------------------------------------
  heroCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: SURFACE,
  },

  heroGearBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGearText: {
    color: 'rgba(11,18,32,0.55)',
    fontSize: 18,
    fontWeight: '900',
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
    fontSize: 28,
    fontWeight: '900',
    color: BRAND_DEEP,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  heroMetaLine: {
    fontSize: 13,
    fontWeight: '800',
    color: MUTED,
    lineHeight: 18,
  },
  heroMetaMuted: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(85,96,112,0.65)',
    lineHeight: 18,
  },
  heroBirthText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(85,96,112,0.85)',
  },

  heroTogetherPill: {
    marginTop: 12,
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
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  heroTogetherStrong: {
    fontSize: 16,
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
    marginTop: 6,
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  recentSection: {
    gap: 16,
    paddingHorizontal: 10,
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
    marginTop: -6,
  },
  recentPreviewList: {
    gap: 0,
  },
  recentItemTitleBalanced: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  recentItemMetaBalanced: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  // ---------------------------------------------------------
  // Weekly Summary
  // ---------------------------------------------------------
  summaryCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(109,106,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.10)',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT,
    lineHeight: 22,
    letterSpacing: 0,
  },
  summaryDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: MUTED,
    lineHeight: 18,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    width: '47%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.08)',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: BRAND_DEEP,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: MUTED,
  },
  summaryFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryFooterText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: 'rgba(85,96,112,0.88)',
  },

  // ---------------------------------------------------------
  // Quick Actions
  // ---------------------------------------------------------
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    columnGap: 8,
  },
  quickGridFrame: {
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 2,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  quickCard: {
    width: '23%',
    minHeight: 84,
    borderRadius: 0,
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 2,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  quickIcon: {
    marginTop: 0,
  },
  quickCardTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: MUTED,
    letterSpacing: 0,
    textAlign: 'center',
  },
  quickCardNote: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    color: BRAND,
    textAlign: 'center',
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
