import { StyleSheet } from 'react-native';

const BG = '#F6F7FB';
const SURFACE = '#FFFFFF';
const TEXT = '#0B1220';
const MUTED = '#556070';
const BORDER = 'rgba(0,0,0,0.06)';
const BRAND = '#6D6AF8';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSideSlot: {
    width: 40,
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
  headerTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  topBarTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  heroCard: {
    borderRadius: 26,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  heroPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF1FF',
    gap: 8,
  },
  heroPlaceholderText: {
    color: BRAND,
    fontWeight: '800',
  },
  heroBody: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  categoryText: {
    color: BRAND,
    fontWeight: '900',
  },
  title: {
    color: TEXT,
    fontWeight: '900',
    lineHeight: 30,
  },
  summary: {
    color: MUTED,
    lineHeight: 21,
  },
  metaCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  sectionTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F5FA',
  },
  metaChipText: {
    color: MUTED,
    fontWeight: '800',
  },
  bodyCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  bodyText: {
    color: TEXT,
    lineHeight: 24,
  },
  emptyCard: {
    marginTop: 18,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 26,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  emptyDesc: {
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
});
