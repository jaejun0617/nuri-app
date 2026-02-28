// 파일: src/screens/Main/MainScreen.styles.ts
// 목적:
// - MainScreen의 Guest/Logged-in UI 스타일
// - Guest는 "로그인 랜딩 홈"처럼 보이도록 (네 이미지 왼쪽 느낌)
// - Logged-in은 실제 홈(오른쪽 느낌)
// - 공통 톤: 베이지/오프화이트 + 소프트 쉐도우 + 라운드 크게

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  /* ---------------------------------------------------------
   * 0) 공통: 화면/스크롤
   * -------------------------------------------------------- */
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EE',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120, // 탭+FAB 고려
  },
  scrollContentLoggedIn: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
  },

  /* ---------------------------------------------------------
   * 1) 헤더
   * -------------------------------------------------------- */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  headerTextArea: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D1B19',
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 13,
    color: '#6E6660',
  },

  // Guest 헤더 우측의 "미니 원(이미지 느낌)"
  guestMiniCircle: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  /* ---------------------------------------------------------
   * 2) Guest: 메인 히어로 카드 (큰 +, CTA)
   * -------------------------------------------------------- */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    alignItems: 'center',
  },
  heroPlusCircle: {
    width: 168,
    height: 168,
    borderRadius: 999,
    backgroundColor: '#F3EEE8',
    borderWidth: 2,
    borderColor: '#E6DFD7',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroPlus: {
    fontSize: 44,
    color: '#B8B0A8',
    marginTop: -2,
  },
  heroHint: {
    fontSize: 13,
    color: '#7A726C',
    marginBottom: 14,
  },
  heroCta: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* ---------------------------------------------------------
   * 3) 섹션 공통
   * -------------------------------------------------------- */
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1D1B19',
    marginBottom: 10,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#6E6660',
    fontWeight: '600',
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  sectionTitleIcon: {
    fontSize: 14,
    opacity: 0.8,
  },

  /* ---------------------------------------------------------
   * 4) 태그
   * -------------------------------------------------------- */
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EFEAE4',
  },
  tagText: {
    fontSize: 12,
    color: '#6C645E',
    fontWeight: '700',
  },

  /* ---------------------------------------------------------
   * 5) Guest: 기록하기 가이드 카드
   * -------------------------------------------------------- */
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  tipHeaderRow: {
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1D1B19',
    marginBottom: 6,
  },
  tipSub: {
    fontSize: 12,
    color: '#6E6660',
    fontWeight: '600',
    lineHeight: 17,
  },
  tipThumbRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipThumb: {
    flex: 1,
    height: 74,
    borderRadius: 14,
    backgroundColor: '#F3EEE8',
  },

  /* ---------------------------------------------------------
   * 6) Guest: 최근 기록 카드
   * -------------------------------------------------------- */
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  recentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recentThumb: {
    flex: 1,
    height: 86,
    borderRadius: 16,
    backgroundColor: '#F3EEE8',
  },
  recentMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  recentMeta: {
    fontSize: 12,
    color: '#6E6660',
    fontWeight: '700',
  },

  /* ---------------------------------------------------------
   * 7) Logged-in: 헤더 멀티펫 스위처
   * -------------------------------------------------------- */
  petSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  petChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  petChipActive: {
    borderWidth: 2,
    borderColor: '#97A48D',
  },
  petChipImage: {
    width: '100%',
    height: '100%',
  },
  petChipPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEE7E1',
  },
  petAddChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6DFD7',
    borderStyle: 'dashed',
  },
  petAddPlus: {
    fontSize: 20,
    color: '#B8B0A8',
    marginTop: -1,
  },

  /* ---------------------------------------------------------
   * 8) Logged-in: 프로필 카드
   * -------------------------------------------------------- */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  profileRow: {
    flexDirection: 'row',
    gap: 12,
  },
  profileImageWrap: {
    width: 84,
    height: 84,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#EFEAE4',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEE7E1',
  },
  profileTextArea: {
    flex: 1,
  },
  petName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1D1B19',
    marginBottom: 6,
  },
  petMeta: {
    fontSize: 12,
    color: '#6E6660',
    fontWeight: '700',
    marginBottom: 10,
  },

  /* ---------------------------------------------------------
   * 9) Logged-in: 오늘의 메시지 (간단 썸네일 row)
   * -------------------------------------------------------- */
  messageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  messageThumb: {
    flex: 1,
    height: 86,
    borderRadius: 16,
    backgroundColor: '#F3EEE8',
  },
  messageCaptionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  messageCaption: {
    flex: 1,
    fontSize: 11,
    color: '#6E6660',
    fontWeight: '700',
  },

  /* ---------------------------------------------------------
   * 10) Logged-in: 최근 기록
   * -------------------------------------------------------- */
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentMore: {
    fontSize: 12,
    color: '#7A726C',
    fontWeight: '700',
  },
  recentGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  recentGridItem: {
    flex: 1,
    height: 140,
    borderRadius: 18,
    backgroundColor: '#F3EEE8',
  },

  /* ---------------------------------------------------------
   * 11) 하단 탭 + 중앙 FAB
   * -------------------------------------------------------- */
  bottomTab: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  tabItem: {
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabText: {
    fontSize: 11,
    color: '#7A726C',
    fontWeight: '700',
  },
  tabTextActive: {
    fontSize: 11,
    color: '#97A48D',
    fontWeight: '900',
  },

  fab: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  fabPlus: {
    fontSize: 26,
    color: '#FFFFFF',
    marginTop: -2,
    fontWeight: '900',
  },
  fabText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 2,
  },
});
