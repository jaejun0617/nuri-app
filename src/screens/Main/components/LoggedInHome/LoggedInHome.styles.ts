// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts
// 목적:
// - LoggedInHome 전용 스타일
// - 모바일 기준 폰트/간격 최적화
// - HERO CARD: 큰 프로필카드 ~ 오늘의 메시지 묶음
// - 최근기록: 이미지 아래 정보(제목/내용 중앙, 날짜 우측)

import { StyleSheet } from 'react-native';

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
  title: { fontSize: 18, fontWeight: '900', color: '#000000' },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555555',
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
  petChipActive: { borderColor: '#000000', borderWidth: 2 },
  petChipImage: { width: '100%', height: '100%' },
  petChipPlaceholder: { flex: 1, backgroundColor: '#EDEDED' },
  petAddChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petAddPlus: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: -1,
  },

  // ---------------------------------------------------------
  // HERO CARD (Profile + Today Message)
  // ---------------------------------------------------------
  heroCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: '#F6F2EE', // screenshot 느낌의 따뜻한 배경 톤
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroLeft: { flex: 1, gap: 4 },
  heroName: { fontSize: 18, fontWeight: '900', color: '#2B2622' },
  heroBreed: { fontSize: 12, fontWeight: '800', color: '#6A625D' },
  heroMeta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6A625D',
    lineHeight: 16,
  },
  heroMetaMuted: { fontSize: 12, fontWeight: '800', color: '#8A827C' },

  heroAvatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.95)',
    backgroundColor: '#EDE7E2',
  },
  heroAvatarImg: { width: '100%', height: '100%' },
  heroAvatarPlaceholder: { flex: 1, backgroundColor: '#DED7D1' },

  heroTagsRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3A342F',
  },

  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginTop: 12,
    marginBottom: 10,
  },
  heroMessageTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2B2622',
    marginBottom: 6,
  },
  heroMessageText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2B2622',
    lineHeight: 19,
  },

  // ---------------------------------------------------------
  // Sections
  // ---------------------------------------------------------
  section: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#000000' },

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
    marginBottom: 2,
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
