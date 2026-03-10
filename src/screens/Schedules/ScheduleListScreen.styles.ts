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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BG,
  },
  headerSideBtn: {
    minWidth: 44,
    height: 34,
    justifyContent: 'center',
  },
  headerSideText: {
    color: MUTED,
    fontWeight: '700',
  },
  headerTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  headerCreateBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND,
  },
  headerCreateText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  heroCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 4,
  },
  heroTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  heroSub: {
    color: MUTED,
    fontWeight: '700',
  },

  list: {
    gap: 10,
  },
  card: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: TEXT,
    fontWeight: '800',
  },
  cardMeta: {
    color: MUTED,
    fontWeight: '700',
  },
  cardNote: {
    color: 'rgba(85,96,112,0.82)',
    lineHeight: 17,
  },

  emptyCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyTitle: {
    color: TEXT,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDesc: {
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 4,
    height: 48,
    minWidth: 164,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
