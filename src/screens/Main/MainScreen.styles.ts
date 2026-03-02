// 파일: src/screens/Main/MainScreen.styles.ts
// 목적:
// - MainScreen의 Guest/Logged-in UI 스타일
// - ✅ 현재 단계 목표: Splash 제외 전체 흰/검 베이스로 "무난하게" 통일
// - ✅ 공통 탭이 전역으로 붙으므로 ScrollView paddingBottom 과다(120) 제거

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  /* ---------------------------------------------------------
   * 0) 공통: 화면/스크롤
   * -------------------------------------------------------- */
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24, // ✅ 전역 탭이 있으니 과한 padding 제거
  },
  scrollContentLoggedIn: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
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
    color: '#000000',
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 13,
    color: '#333333',
  },

  /* ---------------------------------------------------------
   * 2) Guest: 메인 히어로 카드
   * -------------------------------------------------------- */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    alignItems: 'center',
  },
  heroPlusCircle: {
    width: 168,
    height: 168,
    borderRadius: 999,
    backgroundColor: '#F4F4F4',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroPlus: {
    fontSize: 44,
    color: '#777777',
    marginTop: -2,
  },
  heroHint: {
    fontSize: 13,
    color: '#333333',
    marginBottom: 14,
  },
  heroCta: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#000000',
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
    color: '#000000',
    marginBottom: 10,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '600',
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
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  tagText: {
    fontSize: 12,
    color: '#000000',
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
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  petChipActive: {
    borderWidth: 2,
    borderColor: '#000000',
  },
  petChipImage: {
    width: '100%',
    height: '100%',
  },
  petChipPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EDEDED',
  },
  petAddChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderStyle: 'dashed',
  },
  petAddPlus: {
    fontSize: 20,
    color: '#000000',
    marginTop: -1,
  },

  /* ---------------------------------------------------------
   * 8) Logged-in: 프로필 카드
   * -------------------------------------------------------- */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
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
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EDEDED',
  },
  profileTextArea: {
    flex: 1,
  },
  petName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6,
  },
  petMeta: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '700',
    marginBottom: 10,
  },

  /* ---------------------------------------------------------
   * 9) Logged-in: 오늘의 메시지
   * -------------------------------------------------------- */
  messageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  messageThumb: {
    flex: 1,
    height: 86,
    borderRadius: 16,
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  messageCaptionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  messageCaption: {
    flex: 1,
    fontSize: 11,
    color: '#333333',
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
    color: '#333333',
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
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
});
