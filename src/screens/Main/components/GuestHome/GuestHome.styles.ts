// 파일: src/screens/Main/components/GuestHome/GuestHome.styles.ts
// 목적:
// - Guest 전용 레이아웃 스타일 (왼쪽 UI)
// - “가벼운 베이지 + 소프트 쉐도우 + 라운드 크게”

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F2EE' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 96,
  },

  /* 헤더 */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  headerTextArea: { flex: 1, paddingRight: 8 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D1B19',
    marginBottom: 6,
  },
  subTitle: { fontSize: 13, color: '#6E6660' },
  miniAvatar: {
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

  /* 메인 카드 */
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
  heroPlus: { fontSize: 44, color: '#B8B0A8', marginTop: -2 },
  heroHint: { fontSize: 13, color: '#7A726C', marginBottom: 14 },
  heroButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  /* 섹션 공통 */
  section: { marginTop: 16 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1D1B19',
  },
  sectionTitleIcons: { flexDirection: 'row', gap: 6 },
  sectionTitleIcon: { fontSize: 14, opacity: 0.8 },

  /* 태그 */
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EFEAE4',
  },
  tagText: { fontSize: 12, color: '#6C645E', fontWeight: '700' },

  /* 기록하기 안내 카드 */
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
  tipTitle: { fontSize: 14, fontWeight: '900', color: '#1D1B19' },
  tipDesc: {
    marginTop: 6,
    fontSize: 12,
    color: '#6E6660',
    fontWeight: '600',
    lineHeight: 17,
  },
  tipThumbRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  tipThumb: {
    flex: 1,
    height: 74,
    borderRadius: 14,
    backgroundColor: '#F3EEE8',
  },

  /* 기록하기 바 */
  recordBar: {
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
  recordBarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  recordBarRight: { flexDirection: 'row', gap: 8 },
  recordMiniIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  /* 최근 기록 */
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
  recentRow: { flexDirection: 'row', gap: 10 },
  recentThumb: {
    flex: 1,
    height: 86,
    borderRadius: 16,
    backgroundColor: '#F3EEE8',
  },
  recentMetaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  recentMeta: { fontSize: 12, color: '#6E6660', fontWeight: '700' },

  /* 하단 탭 */
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
  tabIcon: { fontSize: 18 },
  tabText: { fontSize: 11, color: '#7A726C', fontWeight: '700' },
  tabTextActive: { fontSize: 11, color: '#97A48D', fontWeight: '900' },
});
