import { StyleSheet } from 'react-native';

const BG = '#FFFFFF';
const SURFACE = 'transparent';
const TEXT = '#0B1220';
const MUTED = '#556070';
const BORDER = 'rgba(0,0,0,0.06)';
const BRAND = '#374151';

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
    width: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  headerBackButton: {
    width: 48,
    height: 48,
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 24,
  },
  heroCard: {
    borderRadius: 0,
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingBottom: 24,
    gap: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  categoryText: {
    color: BRAND,
    fontWeight: '900',
  },
  title: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 32,
  },
  summary: {
    color: MUTED,
    lineHeight: 21,
  },
  metaCard: {
    paddingVertical: 4,
    backgroundColor: SURFACE,
    borderWidth: 0,
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
    paddingVertical: 2,
  },
  metaChipText: {
    color: MUTED,
    fontWeight: '800',
  },
  bodyCard: {
    paddingVertical: 4,
    backgroundColor: SURFACE,
    borderWidth: 0,
    borderColor: BORDER,
    gap: 24,
  },
  bodyText: {
    color: TEXT,
    lineHeight: 27,
  },
  contentBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  contentBlockNormal: {
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  contentBlockCopy: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  contentBlockTitle: {
    fontWeight: '900',
  },
  sourceCard: {
    paddingVertical: 20,
    backgroundColor: SURFACE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    gap: 12,
  },
  sourceRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceCopy: {
    flex: 1,
    gap: 2,
  },
  sourceLabel: {
    color: TEXT,
    fontWeight: '800',
  },
  sourcePublisher: {
    color: MUTED,
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
