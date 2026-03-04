// 파일: src/screens/Records/TimelineScreen.styles.ts

import { StyleSheet } from 'react-native';
import { SCREEN_TOP_SPACING } from '../../theme/layout';

const BRAND = '#6D6AF8';
const TEXT = '#0B1220';

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
    color: TEXT,
    fontWeight: '900',
  },

  createBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { color: '#ffffff', fontWeight: '900' },

  // sticky controls
  controlsWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: SCREEN_TOP_SPACING,
    paddingBottom: 10,
    gap: 10,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  controlChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.18)',
    backgroundColor: 'rgba(109,106,248,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlChipText: { color: BRAND, fontWeight: '900' },

  iconBtn: {
    width: 38,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  iconText: { color: TEXT },

  // category row
  categoryRow: {},
  categoryContent: {
    paddingRight: 14,
    gap: 8, // ✅ ScrollView + map용 간격
  },
  categoryChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 120,
  },
  categoryChipActive: {
    borderColor: 'rgba(109,106,248,0.22)',
    backgroundColor: 'rgba(109,106,248,0.08)',
  },
  categoryChipText: { color: '#0B1220', fontWeight: '900' },
  categoryChipTextActive: { color: BRAND },

  // search
  searchBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    color: TEXT,
    backgroundColor: '#FFFFFF',
  },
  clearBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { color: '#FFFFFF', fontWeight: '900' },

  hintRow: {},
  hintText: { color: '#6B7280', fontWeight: '800' },

  list: { padding: 14, gap: 10, paddingBottom: 24 },
  listEmpty: { flexGrow: 1, padding: 14 },

  item: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { color: '#888888', fontWeight: '800' },

  itemBody: { flex: 1 },
  itemTitle: { color: TEXT, fontWeight: '900' },
  itemContent: { marginTop: 6, color: '#374151' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { color: '#6B7280', fontWeight: '700' },

  badge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  badgeText: { color: BRAND, fontWeight: '900' },

  tags: { marginTop: 8, color: TEXT, fontWeight: '800' },

  empty: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyHero: {
    width: 220,
    height: 220,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPawImage: {
    width: 200,
    height: 200,
  },
  emptyTitle: {
    color: TEXT,
    fontWeight: '900',
    marginTop: -6,
  },
  emptyDesc: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 2,
  },

  primary: {
    marginTop: 14,
    minWidth: 210,
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 24,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryIcon: { color: '#FFFFFF', fontWeight: '900' },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },

  footer: {
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: { color: '#6B7280', fontWeight: '800' },

  manualMoreBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualMoreText: { color: TEXT, fontWeight: '900' },

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
    borderColor: 'rgba(0,0,0,0.08)',
  },
  modalTitle: { color: TEXT, fontWeight: '900', marginBottom: 10 },

  modalItem: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalItemText: { color: TEXT, fontWeight: '900' },
});
