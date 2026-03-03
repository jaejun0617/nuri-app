// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts
// 목적:
// - LoggedInHome 전용 스타일
// - ✅ 1차: 상단(Header) 디자인을 "화이트 + 퍼플" 톤으로 정리
// - hero/section 스타일은 기존 유지

import { StyleSheet } from 'react-native';

const PURPLE = '#6D7CFF';
const BG = '#FFFFFF';
const TEXT = '#0B1220';
const MUTED = '#8A94A6';
const BORDER = '#E6E8F0';

export const styles = StyleSheet.create({
  // ---------------------------------------------------------
  // Layout
  // ---------------------------------------------------------
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1, backgroundColor: BG },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },

  // ---------------------------------------------------------
  // ✅ Header (NEW)
  // ---------------------------------------------------------
  header: { gap: 12, marginBottom: 4 },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  headerTextArea: { flex: 1, gap: 4 },

  title: { fontSize: 20, fontWeight: '900', color: TEXT },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    lineHeight: 16,
  },

  headerIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#F6F7FB',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 16 },

  // ---------------------------------------------------------
  // ✅ Pet Switcher (스크린샷 톤)
  // ---------------------------------------------------------
  petSwitcherRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  petChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: BORDER,
  },
  petChipActive: {
    borderColor: PURPLE,
    borderWidth: 2,
  },

  petChipImage: { width: '100%', height: '100%' },

  petChipFallback: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petChipFallbackText: {
    fontSize: 14,
    fontWeight: '900',
    color: TEXT,
  },

  // active ring 느낌 + 숫자(스크린샷의 "1" 느낌)
  petChipRing: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,124,255,0.06)',
  },
  petChipRingNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: PURPLE,
  },

  petAddChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#F6F7FB',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petAddPlus: {
    color: PURPLE,
    fontSize: 20,
    fontWeight: '900',
    marginTop: -1,
  },

  // ---------------------------------------------------------
  // HERO CARD (기존 유지)
  // ---------------------------------------------------------
  heroCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#F6F2EE',
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroLeft: { flex: 1, gap: 6 },

  heroName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2B2622',
    letterSpacing: -0.3,
  },
  heroTopMeta: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5F5752',
    lineHeight: 18,
  },
  heroTopMetaMuted: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8A827C',
    lineHeight: 18,
  },
  heroBirthText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5F5752',
  },

  heroTogetherPill: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  heroTogetherText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B2622',
  },
  heroTogetherStrong: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2B2622',
  },

  heroAvatarWrap: {
    width: 150,
    height: 150,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.95)',
    backgroundColor: '#EDE7E2',
  },
  heroAvatarImg: { width: '100%', height: '100%' },
  heroAvatarPlaceholder: { flex: 1, backgroundColor: '#DED7D1' },

  heroLine: {
    marginTop: 12,
    marginBottom: 12,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  heroThreeCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroCol: {
    flex: 1,
    paddingHorizontal: 6,
    gap: 6,
  },
  heroColDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  heroColHeader: {
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  heroColTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2B2622',
  },
  heroBullet: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2B2622',
    marginLeft: 5,
  },
  heroBulletMuted: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8A827C',
  },

  heroTagsRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  heroTagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  heroTagText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3A342F',
  },

  heroMessageBox: {
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderColor: 'rgba(0,0,0,0.20)',
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    gap: 8,
  },
  heroMessageLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2622',
  },
  heroMessageText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2B2622',
    lineHeight: 20,
    textAlign: 'center',
  },

  // ---------------------------------------------------------
  // Sections (기존 유지)
  // ---------------------------------------------------------
  section: { gap: 18 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
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
  moreBtnText: { fontSize: 11, fontWeight: '900', color: '#000000' },

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
    color: '#000000',
    textAlign: 'center',
  },
  recentContent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
    textAlign: 'center',
    lineHeight: 15,
  },
  recentMetaRow: { flexDirection: 'row', alignItems: 'center' },
  recentDate: {
    fontSize: 10,
    fontWeight: '800',
    color: '#888888',
    textAlign: 'right',
  },

  // ---------------------------------------------------------
  // CTA Button
  // ---------------------------------------------------------
  recordBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#000000',
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
  emptyTitle: { fontSize: 13, fontWeight: '900', color: '#000000' },
  emptyDesc: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
    lineHeight: 15,
  },
});
