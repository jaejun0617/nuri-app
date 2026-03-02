// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts
// 목적:
// - LoggedInHome 전용 스타일을 완전 독립으로 관리
// - (기존 MainScreen.styles 의존 제거 → 수정 범위 안정화)

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // ---------------------------------------------------------
  // Layout
  // ---------------------------------------------------------
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  header: {
    gap: 12,
  },
  headerTextArea: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444444',
  },

  // ---------------------------------------------------------
  // Pet Switcher
  // ---------------------------------------------------------
  petSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  petChip: {
    width: 44,
    height: 44,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  petChipActive: {
    borderColor: '#000000',
    borderWidth: 2,
  },
  petChipImage: {
    width: '100%',
    height: '100%',
  },
  petChipPlaceholder: {
    flex: 1,
    backgroundColor: '#EDEDED',
  },
  petAddChip: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petAddPlus: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: -1,
  },

  // ---------------------------------------------------------
  // Profile Card
  // ---------------------------------------------------------
  profileCard: {
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  profileRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  profileImageWrap: {
    width: 86,
    height: 86,
    borderRadius: 22,
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
    flex: 1,
    backgroundColor: '#EDEDED',
  },
  profileTextArea: {
    flex: 1,
    gap: 6,
  },
  petName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  petMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444444',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },

  // ---------------------------------------------------------
  // Sections
  // ---------------------------------------------------------
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  sectionDesc: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444444',
  },

  // ---------------------------------------------------------
  // Today Memory Card (1-card unified)
  // ---------------------------------------------------------
  todayCard: {
    height: 200,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  todayImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  todayPlaceholder: {
    flex: 1,
    backgroundColor: '#EDEDED',
  },
  todayOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  todayMessage: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  // ---------------------------------------------------------
  // Recent
  // ---------------------------------------------------------
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentMore: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  recentGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  recentGridItem: {
    flex: 1,
    height: 120,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
});
