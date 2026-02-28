// 파일: src/screens/Main/MainScreen.styles.ts
// 목적:
// - MainScreen(게스트/로그인/등록 전) 하드코딩 UI 스타일
// - "고급스럽고 깨끗한" 톤 유지 (밝은 베이지 + 소프트 쉐도우)

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  /* ---------------------------------------------------------
   * 1) 레이아웃
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
    paddingBottom: 92,
  },

  /* ---------------------------------------------------------
   * 2) 헤더
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

  /* ---------------------------------------------------------
   * 2-1) 멀티펫 스위처 (헤더 우측)
   * - 작은 프로필들 + (+) 버튼
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
   * 3) 메인 카드
   * -------------------------------------------------------- */
  card: {
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
  bigCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#F3EEE8',
    borderWidth: 2,
    borderColor: '#E6DFD7',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bigPlus: {
    fontSize: 40,
    color: '#B8B0A8',
    marginTop: -2,
  },
  cardHint: {
    fontSize: 13,
    color: '#7A726C',
    marginBottom: 14,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* ---------------------------------------------------------
   * 4) 섹션 공통
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

  /* ---------------------------------------------------------
   * 5) 태그
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
   * 6) 오늘의 메시지
   * -------------------------------------------------------- */
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  messageTime: {
    fontSize: 12,
    fontWeight: '800',
    color: '#97A48D',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 13,
    color: '#3A3531',
    lineHeight: 18,
    fontWeight: '600',
  },

  /* ---------------------------------------------------------
   * 7) 오늘의 아이 사진
   * -------------------------------------------------------- */
  todayPhotoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  todayPhotoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: '#F3EEE8',
    marginBottom: 10,
  },
  todayPhotoCaption: {
    fontSize: 12,
    color: '#6E6660',
    fontWeight: '600',
  },

  /* ---------------------------------------------------------
   * 8) 기록하기 버튼
   * -------------------------------------------------------- */
  recordButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#97A48D',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  recordButtonIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 14,
  },

  /* ---------------------------------------------------------
   * 9) 최근 기록
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
  recentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recentThumb: {
    flex: 1,
    height: 92,
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
   * 10) 하단 탭 (하드코딩)
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
    width: '25%',
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
});
