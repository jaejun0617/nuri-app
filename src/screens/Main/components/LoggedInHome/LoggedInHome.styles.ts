// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts
// 목적:
// - LoggedInHome 전용 스타일 (흰색 + 보라색 통일)
// - HERO: 과한 "떠있는 카드" 제거(Flat + border)
// - Avatar: 퍼진 보라 shadow/glow + white ring
// - 오늘의 메시지: 아래 보라 tint + shadow
// - 아코디언: "모두펼치기" + 개별 펼치기
// - "누리와의 소중한 기록" + "오늘날의 사진(전체보기)" 시작

import { StyleSheet } from 'react-native';

const BRAND = '#6d28d9';
const BRAND_DARK = '#5A67FF';
const TEXT = '#0B1220';
const MUTED = '#556070';
const MUTED2 = 'rgba(85,96,112,0.70)';
const BORDER = 'rgba(109,124,255,0.18)';
const BORDER2 = 'rgba(0,0,0,0.06)';
const SURFACE = '#FFFFFF';
const SURFACE_SOFT = '#F6F7FB';

export const styles = StyleSheet.create({
  // ---------------------------------------------------------
  // Layout
  // ---------------------------------------------------------
  screen: { flex: 1, backgroundColor: SURFACE },
  scroll: { flex: 1, backgroundColor: SURFACE },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  header: { gap: 10, marginBottom: 4 },
  headerTextArea: { gap: 4 },
  title: { fontSize: 18, fontWeight: '900', color: TEXT },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    lineHeight: 16,
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
    borderColor: BORDER2,
  },
  petChipActive: { borderColor: BRAND, borderWidth: 2 },
  petChipImage: { width: '100%', height: '100%' },
  petChipPlaceholder: { flex: 1, backgroundColor: 'rgba(109,124,255,0.12)' },

  petAddChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  petAddPlus: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: -1,
  },

  // ---------------------------------------------------------
  // HERO CARD (프로필 카드)
  // ---------------------------------------------------------
  heroCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
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
    backgroundColor: 'rgba(109,124,255,0.10)',
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

  // Avatar: 퍼진 보라 glow + ring
  heroAvatarOuter: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroAvatarGlow: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 999,
    backgroundColor: 'rgba(109,124,255,0.22)',
    shadowColor: BRAND,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroAvatarWrap: {
    width: 132,
    height: 132,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.98)',
    backgroundColor: 'rgba(109,124,255,0.08)',
  },
  heroAvatarImg: { width: '100%', height: '100%' },
  heroAvatarPlaceholder: { flex: 1, backgroundColor: 'rgba(109,124,255,0.18)' },

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

  // ✅ 여기부터 이어서(요청하신 부분)
  heroTogetherPill: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroTogetherText: {
    fontSize: 13,
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
  // Accordion: Controls
  // ---------------------------------------------------------
  accordionWrap: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    overflow: 'hidden',
  },
  accordionAllRow: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(109,124,255,0.06)',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  accordionAllLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: BRAND_DARK,
  },
  accordionAllIcon: {
    fontSize: 14,
    fontWeight: '900',
    color: BRAND_DARK,
    marginTop: -1,
  },

  accordionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(109,124,255,0.10)',
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
  iconCircleBlue: { backgroundColor: 'rgba(109,124,255,0.12)' },
  iconCircleOrange: { backgroundColor: 'rgba(255,176,32,0.14)' },
  iconCirclePink: { backgroundColor: 'rgba(255,77,79,0.12)' },
  iconCirclePurple: { backgroundColor: 'rgba(109,124,255,0.12)' },

  accordionIconText: { fontSize: 16, fontWeight: '900', color: TEXT },
  accordionTitle: { fontSize: 13, fontWeight: '900', color: TEXT },
  accordionChevron: {
    fontSize: 16,
    fontWeight: '900',
    color: 'rgba(11,18,32,0.50)',
    marginTop: -2,
  },

  accordionBody: { marginTop: 10, gap: 8, paddingLeft: 44 },
  accordionBullet: { fontSize: 13, fontWeight: '800', color: MUTED },
  accordionEmpty: { fontSize: 13, fontWeight: '800', color: MUTED2 },

  // Tags (body)
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(109,124,255,0.06)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '900',
    color: BRAND_DARK,
  },

  // ---------------------------------------------------------
  // Today Message (아래 음영/보라 tint + shadow)
  // ---------------------------------------------------------
  heroMessageBox: {
    marginTop: 14,
    // borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    // backgroundColor: 'rgba(109,124,255,0.08)',
    // borderWidth: 1,
    // borderColor: 'rgba(109,124,255,0.14)',
    // shadowColor: BRAND,
    // shadowOpacity: 0.22,
    // shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    // elevation: 3,
    alignItems: 'center',
  },
  heroMessageText: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT,
    lineHeight: 20,
    textAlign: 'center',
  },

  // ---------------------------------------------------------
  // Section: "누리와의 소중한 기록" Header Block
  // ---------------------------------------------------------
  sectionLead: { gap: 6, marginTop: 6 },
  sectionLeadTitle: { fontSize: 22, fontWeight: '900', color: TEXT },
  sectionLeadSub: { fontSize: 12, fontWeight: '700', color: MUTED },

  // ---------------------------------------------------------
  // Sections
  // ---------------------------------------------------------
  section: { gap: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '900',
    color: BRAND_DARK,
  },

  // ---------------------------------------------------------
  // Today Photo Card (보라톤 overlay 통일)
  // ---------------------------------------------------------
  photoCard: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: SURFACE_SOFT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  photoImage: { width: '100%', height: '100%', position: 'absolute' },
  photoPlaceholder: { flex: 1, backgroundColor: 'rgba(109,124,255,0.10)' },

  photoOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
    backgroundColor: 'rgba(11,18,32,0.24)',
  },
  photoOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(109,124,255,0.12)',
  },
  photoOverlayTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  photoOverlaySub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },

  // ---------------------------------------------------------
  // Recent (Header)
  // ---------------------------------------------------------
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  moreBtnText: { fontSize: 11, fontWeight: '900', color: BRAND_DARK },

  // ---------------------------------------------------------
  // Recent (List)
  // ---------------------------------------------------------
  recentList: { gap: 12 },

  recentItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    overflow: 'hidden',
  },
  recentThumb: { height: 210, backgroundColor: SURFACE_SOFT },
  recentThumbImg: { width: '100%', height: '100%' },
  recentThumbPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(109,124,255,0.10)',
  },

  recentInfo: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: TEXT,
    textAlign: 'center',
  },
  recentContent: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 15,
  },
  recentMetaRow: { flexDirection: 'row', alignItems: 'center' },
  recentDate: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(85,96,112,0.65)',
    textAlign: 'right',
  },

  // ---------------------------------------------------------
  // CTA Button
  // ---------------------------------------------------------
  recordBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: BRAND,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  recordBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  // ---------------------------------------------------------
  // Empty Box
  // ---------------------------------------------------------
  emptyBox: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    gap: 6,
  },
  emptyTitle: { fontSize: 13, fontWeight: '900', color: TEXT },
  emptyDesc: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    lineHeight: 15,
  },
});
