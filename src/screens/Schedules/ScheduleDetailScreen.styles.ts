import { StyleSheet } from 'react-native';

const TEXT = '#0B1220';
const MUTED = '#556070';
const BG = '#FFFFFF';
const SURFACE = '#FFFFFF';
const BORDER = 'rgba(0,0,0,0.06)';
const BRAND = '#6D6AF8';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 36, gap: 12 },

  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BG,
  },
  headerSideSlot: {
    width: 56,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', color: TEXT, fontWeight: '900' },
  headerActionBtn: { minWidth: 44, height: 34, alignItems: 'flex-end', justifyContent: 'center' },
  headerActionText: { color: BRAND, fontWeight: '900' },

  emptyCard: {
    borderRadius: 8,
    paddingVertical: 22,
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyText: { color: MUTED, fontWeight: '700' },

  hero: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
    gap: 8,
  },
  title: { color: TEXT, fontWeight: '900' },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontWeight: '900',
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 6,
    gap: 4,
  },
  metaBlock: { paddingVertical: 10, gap: 6 },
  metaLabel: { color: MUTED, fontWeight: '800' },
  metaValue: { color: TEXT, fontWeight: '700', lineHeight: 22 },
  actions: {
    gap: 10,
    paddingTop: 4,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 8,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
  secondaryBtn: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryBtnText: { color: '#4F46E5', fontWeight: '900' },
  deleteBtn: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
  },
  deleteBtnText: { color: '#E11D48', fontWeight: '900' },
});
