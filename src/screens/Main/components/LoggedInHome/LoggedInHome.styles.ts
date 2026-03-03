// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts
// 목적:
// - LoggedInHome 전용 스타일
// - ✅ HERO 카드: "스샷 레이아웃" (중앙 정렬 + 보라 pill + 아코디언 + 하단 메시지)
// - 나머지 섹션(오늘사진/최근기록)은 기존 스타일 유지

import { StyleSheet } from 'react-native';

const BRAND = '#6D7CFF'; // theme.colors.brand와 동일 컨셉(white + purple)
const BORDER = 'rgba(0,0,0,0.06)';

export const styles = StyleSheet.create({
  // ---------------------------------------------------------
  // Layout
  // ---------------------------------------------------------
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: '#FFFFFF' },
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
  title: { fontSize: 18, fontWeight: '900', color: '#0B1220' },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#556070',
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
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  petChipActive: { borderColor: BRAND, borderWidth: 2 },
  petChipImage: { width: '100%', height: '100%' },
  petChipPlaceholder: { flex: 1, backgroundColor: '#EDEDED' },
  petAddChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#EEF0FF',
    borderWidth: 1,
    borderColor: 'rgba(109,124,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petAddPlus: {
    color: BRAND,
    fontSize: 18,
    fontWeight: '900',
    marginTop: -1,
  },

  // ---------------------------------------------------------
  // HERO CARD (✅ 스샷 레이아웃)
  // ---------------------------------------------------------
  heroCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,

    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  heroSettingBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSettingIcon: {
    fontSize: 18,
    color: '#8A94A6',
    fontWeight: '900',
  },

  heroAvatarOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  heroAvatarWrap: {
    width: 140,
    height: 140,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 5,
    borderColor: 'rgba(109,124,255,0.18)',
    backgroundColor: '#F3F4FF',
  },
  heroAvatarImg: { width: '100%', height: '100%' },
  heroAvatarPlaceholder: { flex: 1, backgroundColor: '#E7E9FF' },

  heroNameCentered: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '900',
    color: '#0B1220',
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  heroMetaLine: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#556070',
    textAlign: 'center',
  },
  heroMetaMuted: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#8A94A6',
    textAlign: 'center',
  },

  heroBirthCentered: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#8A94A6',
    textAlign: 'center',
  },

  heroTogetherPillPurple: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: BRAND,

    shadowColor: BRAND,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTogetherPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroTogetherPillStrong: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  heroExpandAllRow: {
    marginTop: 14,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  heroExpandAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A94A6',
  },
  heroChevron: {
    fontSize: 14,
    fontWeight: '900',
    color: '#8A94A6',
    transform: [{ rotate: '0deg' }],
    marginTop: -1,
  },
  heroChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },

  heroAccordion: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },

  heroAccItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },

  heroAccHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 10,
  },

  heroAccIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAccIconCircleBlue: { backgroundColor: '#EAF0FF' },
  heroAccIconCircleOrange: { backgroundColor: '#FFF2EA' },
  heroAccIconCirclePink: { backgroundColor: '#FFEAF1' },
  heroAccIconCirclePurple: { backgroundColor: '#EEF0FF' },

  heroAccIconText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B1220',
  },

  heroAccTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  heroAccTitleBlue: { color: '#2F6BFF' },
  heroAccTitleOrange: { color: '#FF7A30' },
  heroAccTitlePink: { color: '#FF4FA3' },
  heroAccTitlePurple: { color: BRAND },

  heroAccChevron: {
    fontSize: 14,
    fontWeight: '900',
    color: '#8A94A6',
    transform: [{ rotate: '0deg' }],
    marginTop: -1,
  },
  heroAccChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },

  heroAccBody: {
    paddingHorizontal: 44,
    paddingBottom: 12,
    paddingTop: 2,
  },

  heroAccChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroAccChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F6F7FB',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  heroAccChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B1220',
  },
  heroAccEmptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A94A6',
  },

  heroMessageBox: {
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F6F7FB',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  heroMessageText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B1220',
    lineHeight: 19,
    textAlign: 'center',
  },

  // ---------------------------------------------------------
  // Sections
  // ---------------------------------------------------------
  section: { gap: 18 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0B1220',
    marginBottom: 6,
  },

  // ---------------------------------------------------------
  // Today Photo Card
  // ---------------------------------------------------------
  photoCard: {
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  photoImage: { width: '100%', height: '100%', position: 'absolute' },
  photoPlaceholder: { flex: 1, backgroundColor: '#EDEDED' },
  photoOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  photoOverlayTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  photoOverlaySub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
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
  moreBtnText: { fontSize: 11, fontWeight: '900', color: '#0B1220' },

  // ---------------------------------------------------------
  // Recent (List)
  // ---------------------------------------------------------
  recentList: { gap: 12 },

  recentItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  recentThumb: { height: 210, backgroundColor: '#F4F4F4' },
  recentThumbImg: { width: '100%', height: '100%' },
  recentThumbPlaceholder: { flex: 1, backgroundColor: '#EDEDED' },

  recentInfo: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0B1220',
    textAlign: 'center',
  },
  recentContent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#556070',
    textAlign: 'center',
    lineHeight: 15,
  },
  recentMetaRow: { flexDirection: 'row', alignItems: 'center' },
  recentDate: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A94A6',
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
  },
  recordBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  // ---------------------------------------------------------
  // Empty Box
  // ---------------------------------------------------------
  emptyBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  emptyTitle: { fontSize: 13, fontWeight: '900', color: '#0B1220' },
  emptyDesc: {
    fontSize: 11,
    fontWeight: '700',
    color: '#556070',
    lineHeight: 15,
  },
});
