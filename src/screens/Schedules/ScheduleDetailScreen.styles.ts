import { StyleSheet } from 'react-native';

const TEXT = '#0B1220';
const MUTED = '#556070';
const BG = '#F6F7FB';
const SURFACE = '#FFFFFF';
const BORDER = 'rgba(0,0,0,0.06)';
const BRAND = '#6D6AF8';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

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
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyText: { color: MUTED, fontWeight: '700' },

  card: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { color: TEXT, fontWeight: '900', marginBottom: 18 },
  metaBlock: { marginBottom: 16, gap: 6 },
  metaLabel: { color: MUTED, fontWeight: '800' },
  metaValue: { color: TEXT, fontWeight: '700', lineHeight: 22 },
  primaryBtn: {
    marginTop: 6,
    height: 50,
    borderRadius: 16,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
  secondaryBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  secondaryBtnText: { color: '#4F46E5', fontWeight: '900' },
  deleteBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
  },
  deleteBtnText: { color: '#E11D48', fontWeight: '900' },
});
