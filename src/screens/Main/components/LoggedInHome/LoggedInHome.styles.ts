// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts
// 목적:
// - LoggedInHome 전용 스타일 (스크린샷 톤)
// - ✅ 오늘날의 기록(슬라이드): 정사각 5:5, 옆 카드 살짝 보임
//   - overlay: 상단 최소 / 하단 그라데이션 강화 + 텍스트는 이미지 위
//   - indicator dot: BRAND 컬러 기반

import { StyleSheet } from 'react-native';

const BRAND = '#6D6AF8';
const BRAND_DEEP = '#5753E6';

const TEXT = '#0B1220';
const MUTED = '#556070';
const MUTED2 = 'rgba(85,96,112,0.70)';

const SURFACE = '#FFFFFF';
const SURFACE_SOFT = '#F6F7FB';

const BORDER = 'rgba(109,106,248,0.18)';
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
    paddingTop: 10,
    paddingBottom: 34,
    gap: 18,
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
  title: { fontSize: 18, fontWeight: '900', color: TEXT },
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
  // HERO CARD
  // ---------------------------------------------------------
  heroCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },

  heroGearBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,106,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.10)',
  },
  heroGearText: {
    color: 'rgba(11,18,32,0.55)',
    fontSize: 16,
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
    color: TEXT,
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
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.14)',
    backgroundColor: 'rgba(109,106,248,0.06)',
  },
  tagText: { fontSize: 12, fontWeight: '900', color: BRAND_DEEP },

  // ---------------------------------------------------------
  // Today Message
  // ---------------------------------------------------------
  heroMessageBox: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroMessageIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,196,0,0.12)',
  },
  heroMessageIconText: { fontSize: 16, fontWeight: '900' },
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
    gap: 6,
    marginTop: 16,
    paddingTop: 20,
    paddingHorizontal: 14,
  },
  sectionLeadTitle: { fontSize: 18, fontWeight: '600', color: TEXT },
  sectionLeadSub: { fontSize: 12, fontWeight: '500', color: MUTED },

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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: TEXT },
  sectionLink: { fontSize: 12, fontWeight: '700', color: BRAND_DEEP },

  // ---------------------------------------------------------
  // Today Photo Card
  // ---------------------------------------------------------
  photoCard: {
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: SURFACE_SOFT,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  photoImage: { width: '100%', height: '100%', position: 'absolute' },
  photoPlaceholder: { flex: 1, backgroundColor: 'rgba(0,0,0,0.06)' },

  photoOverlayTint: {
    ...ABS_FILL,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  photoOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.26)',
  },
  photoOverlayTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  photoOverlaySub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },

  // ---------------------------------------------------------
  // ✅ Today Records (Slider) - FINAL (PhotoCard 톤과 동일하게 "전체 오버레이 + 하단 강화")
  // ---------------------------------------------------------
  todayRecordsWrap: {
    marginTop: -6,
  },
  todayRecordsContent: {
    paddingLeft: 0,
  },

  todayRecordCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',

    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 3,
  },

  todayRecordMedia: {
    flex: 1,
    backgroundColor: SURFACE_SOFT,
  },
  todayRecordImg: {
    ...ABS_FILL,
    width: '100%',
    height: '100%',
  },
  todayRecordImgPlaceholder: {
    ...ABS_FILL,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },

  // ✅ 1) 전체 오버레이(오늘의 사진과 동일한 "전체 틴트")
  todayRecordOverlayTint: {
    ...ABS_FILL,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // ✅ 2) 하단 강화(텍스트 가독성)
  // - RN 기본만으로 그라데이션 느낌: 레이어 2개로 처리
  todayRecordBottomTint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    // backgroundColor: 'rgba(0,0,0,0.26)',
  },
  todayRecordBottomTintDeep: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.26)',
  },

  // ✅ 3) 텍스트 위치/간격
  todayRecordOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },

  todayRecordTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  todayRecordContent: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 15,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  todayRecordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  todayRecordDate: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.92)',
  },
  // ---------------------------------------------------------
  // ✅ Indicator Dots (Brand)
  // ---------------------------------------------------------
  indicatorRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: BRAND,
  },

  // ---------------------------------------------------------
  // ✅ More Hint
  // ---------------------------------------------------------
  moreHintRow: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreHintText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(85,96,112,0.82)',
  },

  // ---------------------------------------------------------
  // Quick Actions
  // ---------------------------------------------------------
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  quickCardWrap: {
    width: '48%',
    position: 'relative',
  },
  quickCard: {
    width: '100%',
    minHeight: 142,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
    borderWidth: 0,
  },
  cardBottomShadow: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: -4,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.06)',
    opacity: 0.42,
  },
  quickIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,106,248,0.10)',
    marginBottom: 12,
  },
  quickIcon: {
    marginTop: 0,
  },
  quickCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: -0.4,
  },
  quickCardNote: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    color: BRAND,
  },

  // ---------------------------------------------------------
  // Recommendation Tips
  // ---------------------------------------------------------
  tipSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT,
    letterSpacing: -0.3,
  },
  tipList: {
    gap: 12,
  },
  tipCardWrap: {
    position: 'relative',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
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
    fontSize: 11,
    fontWeight: '900',
    color: BRAND,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  tipDescription: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    lineHeight: 17,
  },

  // ---------------------------------------------------------
  // CTA Button / Empty Box
  // ---------------------------------------------------------
  recordBtn: {
    height: 46,
    borderRadius: 14,
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
  recordBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  emptyBox: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: SURFACE,
    gap: 6,
  },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: TEXT },
  emptyDesc: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    lineHeight: 15,
  },
});
