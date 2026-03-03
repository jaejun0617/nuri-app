// 파일: src/screens/Records/TimelineScreen.styles.ts
// 목적:
// - TimelineScreen 스타일 분리

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#000000',
    fontWeight: '900',
  },

  createBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { color: '#ffffff', fontWeight: '900' },

  // sticky controls
  controlsWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  controlChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlChipText: { color: '#000000', fontWeight: '900' },

  iconBtn: {
    width: 38,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#000000' },

  searchBox: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 12,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  clearBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { color: '#FFFFFF', fontWeight: '900' },

  hintRow: { marginTop: 8 },
  hintText: { color: '#777777', fontWeight: '800' },

  list: { padding: 14, gap: 10, paddingBottom: 24 },
  listEmpty: { flexGrow: 1, padding: 14 },

  item: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { color: '#888888', fontWeight: '800' },

  itemBody: { flex: 1 },
  itemTitle: { color: '#000000', fontWeight: '900' },
  itemContent: { marginTop: 6, color: '#333333' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { color: '#777777', fontWeight: '700' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  badgeText: { color: '#000000', fontWeight: '800' },

  tags: { marginTop: 8, color: '#000000', fontWeight: '800' },

  empty: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: { color: '#000000', fontWeight: '900' },
  emptyDesc: { color: '#333333', textAlign: 'center' },

  primary: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },

  footer: {
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: { color: '#777777', fontWeight: '800' },

  manualMoreBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualMoreText: { color: '#000000', fontWeight: '900' },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  modalTitle: { color: '#000000', fontWeight: '900', marginBottom: 10 },

  modalItem: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalItemText: { color: '#000000', fontWeight: '900' },
});
