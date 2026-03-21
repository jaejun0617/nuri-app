import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    paddingBottom: 8,
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0B1220',
    fontWeight: '900',
  },
  sectionWrap: {
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  chipRow: {
    paddingRight: 8,
    gap: 8,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DEE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: '#2F8F48',
    backgroundColor: '#EDF6EE',
  },
  chipText: {
    color: '#4B5565',
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#2F8F48',
  },
  searchWrap: {
    gap: 10,
    marginBottom: 12,
  },
  searchInputWrap: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAF1',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#102033',
    fontSize: 14,
    paddingVertical: 0,
  },
  searchHelperText: {
    color: '#6A7687',
    lineHeight: 19,
  },
  resultMetaBar: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4EAF1',
  },
  resultMetaText: {
    color: '#6A7687',
    lineHeight: 18,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 32,
    gap: 10,
  },
  listHeaderContent: {
    paddingBottom: 8,
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EDF6EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  cardCategory: {
    color: '#2F8F48',
    fontWeight: '800',
  },
  cardTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  cardSummary: {
    color: '#526070',
    lineHeight: 21,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceBadge: {
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sourceBadgeText: {
    color: '#697586',
    fontWeight: '800',
  },
  neutralBadge: {
    borderRadius: 999,
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  neutralBadgeText: {
    color: '#516074',
    fontWeight: '800',
  },
  highlightBadge: {
    borderRadius: 999,
    backgroundColor: '#FFF4DF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  highlightBadgeText: {
    color: '#A05B00',
    fontWeight: '800',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    flex: 1,
    color: '#6E788A',
    lineHeight: 20,
  },
  cardNotice: {
    color: '#7C4A00',
    lineHeight: 20,
  },
  petStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  petStatusBadgeConfirmed: {
    backgroundColor: '#E8F7EC',
  },
  petStatusBadgePossible: {
    backgroundColor: '#EEF6EA',
  },
  petStatusBadgeCautious: {
    backgroundColor: '#FFF5E8',
  },
  petStatusBadgeText: {
    fontWeight: '800',
  },
  petStatusBadgeTextConfirmed: {
    color: '#196A34',
  },
  petStatusBadgeTextPossible: {
    color: '#2F8F48',
  },
  petStatusBadgeTextCautious: {
    color: '#A05B00',
  },
  emptyCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  emptyBody: {
    color: '#6E788A',
    lineHeight: 20,
  },
  errorCard: {
    borderRadius: 20,
    backgroundColor: '#FFF5F1',
    padding: 18,
    gap: 8,
    marginBottom: 12,
  },
  errorTitle: {
    color: '#A2451B',
    fontWeight: '900',
  },
  errorBody: {
    color: '#7B4A33',
    lineHeight: 20,
  },
  retryButton: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#FFE6DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  retryButtonText: {
    color: '#A2451B',
    fontWeight: '900',
  },
  loadingCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 8,
  },
  loadingTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  loadingBody: {
    color: '#6E788A',
    lineHeight: 20,
  },
  loadingMoreCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  loadingMoreText: {
    color: '#6A7687',
    fontWeight: '700',
  },
  detailScrollContent: {
    paddingBottom: 36,
    gap: 14,
  },
  detailHero: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 10,
  },
  detailCategory: {
    color: '#2F8F48',
    fontWeight: '800',
  },
  detailTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  detailSummary: {
    color: '#526070',
    lineHeight: 22,
  },
  detailMetaGrid: {
    gap: 10,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailMetaText: {
    flex: 1,
    color: '#5D697A',
    lineHeight: 20,
  },
  detailSectionCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 10,
  },
  detailSectionTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  detailSectionBody: {
    color: '#526070',
    lineHeight: 21,
  },
  detailHighlightWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapCard: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#DDE5EE',
    height: 210,
  },
  mapWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#DDE5EE',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapFallbackCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    backgroundColor: '#E6EDF5',
  },
  mapFallbackTitle: {
    color: '#102033',
    fontWeight: '900',
    textAlign: 'center',
  },
  mapFallbackBody: {
    color: '#607084',
    textAlign: 'center',
    lineHeight: 18,
  },
  mapOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(16,32,51,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapOverlayText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#2F8F48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
