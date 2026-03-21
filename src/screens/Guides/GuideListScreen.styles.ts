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
    flex: 1,
    textAlign: 'center',
    color: TEXT,
    fontWeight: '900',
  },
  searchToggleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  searchCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  searchInputWrap: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#F7F8FD',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    paddingVertical: 0,
    fontSize: 14,
    fontWeight: '600',
  },
  searchClearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchHelperText: {
    color: MUTED,
    lineHeight: 18,
  },
  searchMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchMetaText: {
    color: MUTED,
    flex: 1,
    lineHeight: 18,
  },
  searchMetaLoadingText: {
    color: BRAND,
    fontWeight: '800',
  },
  debugBadge: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugBadgeRemote: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  debugBadgeSeed: {
    backgroundColor: 'rgba(245,158,11,0.14)',
  },
  debugBadgeEmpty: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  debugBadgeText: {
    color: TEXT,
    fontWeight: '800',
  },
  suggestionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 14,
  },
  suggestionSection: {
    gap: 10,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  suggestionToggleButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  suggestionToggleCopy: {
    flex: 1,
    gap: 3,
  },
  suggestionToggleMeta: {
    color: MUTED,
    lineHeight: 18,
  },
  suggestionTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  suggestionHelperText: {
    color: MUTED,
    lineHeight: 18,
  },
  suggestionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  suggestionActionText: {
    color: BRAND,
    fontWeight: '800',
  },
  suggestionEmptyText: {
    color: MUTED,
    lineHeight: 19,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F7F8FD',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.12)',
  },
  chipButtonActive: {
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  chipButtonText: {
    color: TEXT,
    fontWeight: '700',
  },
  chipButtonTextActive: {
    color: BRAND,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12,
  },
  separator: {
    height: 12,
  },
  emptyCard: {
    marginHorizontal: 16,
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
    textAlign: 'center',
  },
  emptyDesc: {
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  resetSearchButton: {
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  resetSearchButtonText: {
    color: BRAND,
    fontWeight: '900',
  },
});
