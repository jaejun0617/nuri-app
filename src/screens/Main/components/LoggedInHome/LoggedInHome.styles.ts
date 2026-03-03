// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts
// 목적:
// - LoggedInHome 전용 스타일 (흰색 + 보라색 통일, 스크린샷 톤)
// - Header: 텍스트 + 우측 아이콘(검색/알림) + 멀티펫 스위처
// - HERO: flat 카드 + soft border/shadow + avatar glow + together pill
// - Accordion: 모두펼치기 + 개별 토글 + 리스트/태그 chip
// - Today Message: subtle border + soft shadow + icon
// - Today Photo: 보라 overlay tint + 하단 텍스트
// - Recent: 카드 톤 통일 + 썸네일 tint

import { StyleSheet } from 'react-native';

const BRAND = '#6D7CFF'; // 브랜드 포인트 (요구사항)
const BRAND_DEEP = '#5A67FF';
const BRAND_SOFT = 'rgba(109,124,255,0.12)';

const TEXT = '#0B1220';
const MUTED = '#556070';
const MUTED2 = 'rgba(85,96,112,0.70)';

const SURFACE = '#FFFFFF';
const SURFACE_SOFT = '#F6F7FB';

const BORDER = 'rgba(109,124,255,0.18)';
const BORDER2 = 'rgba(0,0,0,0.06)';

export const styles = StyleSheet.create({
  // ---------------------------------------------------------
  // Layout
  // ---------------------------------------------------------
  screen: { flex: 1, backgroundColor: SURFACE },
  scroll: { flex: 1, backgroundColor: SURFACE },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 14,
  },

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  header: { gap: 10, marginBottom: 4 },
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
    borderColor: BORDER2,
  },
  // ✅ active: 보라 링 + 은은 글로우 느낌
  petChipActive: {
    borderColor: BRAND,
    borderWidth: 2,
    shadowColor: BRAND,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  petChipImage: { width: '100%', height: '100%' },
  petChipPlaceholder: { flex: 1, backgroundColor: BRAND_SOFT },

  petAddChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER2,
  },
  petAddPlus: {
    color: BRAND_DEEP,
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
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    // ✅ 과한 "떠있음" 제거: 아주 얕은 shadow만
    shadowColor: BRAND,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 1,
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

  // Avatar: 퍼진 보라 glow + white ring
  heroAvatarOuter: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroAvatarGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(109,124,255,0.22)',
    shadowColor: BRAND,
    shadowOpacity: 0.36,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
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

  // Together pill (스크린샷 톤: 진보라 + 부드러운 그림자)
  heroTogetherPill: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: BRAND_DEEP,
    shadowColor: BRAND_DEEP,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
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
  // Accordion
  // ---------------------------------------------------------
  accordionWrap: {
    marginTop: 14,
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
    color: BRAND_DEEP,
  },
  accordionAllIcon: {
    fontSize: 14,
    fontWeight: '900',
    color: BRAND_DEEP,
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

  // Tags
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
    color: BRAND_DEEP,
  },

  // ---------------------------------------------------------
  // Today Message (스크린샷 톤: border + soft shadow + icon)
  // ---------------------------------------------------------
  heroMessageBox: {
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: BRAND,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
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
    backgroundColor: 'rgba(255,196,0,0.12)', // 달 아이콘 옅은 노랑 톤
  },
  heroMessageIconText: { fontSize: 16, fontWeight: '900' },
  heroMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: TEXT,
    lineHeight: 18,
  },

  // ---------------------------------------------------------
  // Section Lead
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
  sectionTitle: { fontSize: 16, fontWeight: '900', color: TEXT },
  sectionLink: { fontSize: 12, fontWeight: '900', color: BRAND_DEEP },

  // ---------------------------------------------------------
  // Today Photo Card
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
  photoPlaceholder: { flex: 1, backgroundColor: BRAND_SOFT },

  // 보라 tint overlay (그라데이션 느낌은 레이어 2장으로 흉내)
  photoOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(109,124,255,0.14)',
  },
  photoOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
    backgroundColor: 'rgba(11,18,32,0.22)',
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
  moreBtnText: { fontSize: 11, fontWeight: '900', color: BRAND_DEEP },

  // ---------------------------------------------------------
  // Recent (List)
  // ---------------------------------------------------------
  recentList: { gap: 12 },

  recentItem: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    overflow: 'hidden',
  },

  recentThumb: {
    height: 210,
    backgroundColor: SURFACE_SOFT,
    overflow: 'hidden',
  },
  recentThumbImg: { width: '100%', height: '100%' },
  recentThumbPlaceholder: { flex: 1, backgroundColor: BRAND_SOFT },

  // ✅ tsx에서 올려둔 tint 레이어
  recentThumbTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(109,124,255,0.08)',
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
    backgroundColor: BRAND_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: BRAND_DEEP,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  recordBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  // ---------------------------------------------------------
  // Empty Box
  // ---------------------------------------------------------
  emptyBox: {
    borderRadius: 18,
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
