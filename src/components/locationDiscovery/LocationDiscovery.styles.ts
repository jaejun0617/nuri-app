import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#0B1220',
    fontWeight: '900',
  },
  searchWrap: {
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  searchInputWrap: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2F8',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#0B1220',
    fontWeight: '700',
  },
  searchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchHelperText: {
    flex: 1,
    color: '#7B8597',
    fontWeight: '700',
  },
  searchLoadingText: {
    color: '#6D6AF8',
    fontWeight: '800',
  },
  locationInfoCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(47,143,72,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCopy: {
    flex: 1,
    gap: 2,
  },
  locationTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  locationSubtitle: {
    color: '#6E788A',
    fontWeight: '700',
  },
  locationRefreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  locationRefreshButtonText: {
    color: '#5753E6',
    fontWeight: '900',
  },
  filterSection: {
    gap: 10,
    marginBottom: 12,
  },
  filterToggleButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  filterToggleCopy: {
    flex: 1,
    gap: 3,
  },
  filterLabel: {
    color: '#7B8597',
    fontWeight: '800',
  },
  filterToggleValue: {
    color: '#102033',
    fontWeight: '900',
  },
  filterChipRow: {
    gap: 8,
    paddingRight: 12,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipSelected: {
    backgroundColor: '#2F8F48',
  },
  filterChipText: {
    color: '#4F5B6B',
    fontWeight: '800',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8DEEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipSelected: {
    borderColor: '#2F8F48',
    backgroundColor: 'rgba(47,143,72,0.08)',
  },
  sortChipText: {
    color: '#4F5B6B',
    fontWeight: '800',
  },
  sortChipTextSelected: {
    color: '#2F8F48',
  },
  sectionTitle: {
    color: '#0B1220',
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(47,143,72,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  cardCategory: {
    color: '#FA6B2D',
    fontWeight: '900',
  },
  cardTitle: {
    color: '#0B1220',
    fontWeight: '900',
  },
  cardDistance: {
    color: '#2F8F48',
    fontWeight: '900',
  },
  cardDescription: {
    color: '#4D586A',
    lineHeight: 20,
  },
  cardMetaRow: {
    gap: 8,
  },
  cardMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    color: '#7B8597',
    fontWeight: '700',
  },
  cardNotice: {
    color: '#FA6B2D',
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  emptyTitle: {
    color: '#0B1220',
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDesc: {
    color: '#6E788A',
    textAlign: 'center',
    lineHeight: 21,
  },
  primaryActionButton: {
    marginTop: 6,
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: 22,
    backgroundColor: '#FA6B2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  detailScrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 34,
    gap: 16,
  },
  detailHero: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 12,
  },
  relatedSection: {
    gap: 12,
    marginTop: 4,
  },
  relatedSectionHeader: {
    gap: 4,
    paddingHorizontal: 2,
  },
  relatedSectionTitle: {
    color: '#0B1220',
    fontWeight: '900',
  },
  relatedSectionCaption: {
    color: '#7B8597',
    fontWeight: '700',
  },
  relatedList: {
    gap: 12,
  },
  detailCategory: {
    color: '#FA6B2D',
    fontWeight: '900',
  },
  detailTitle: {
    color: '#0B1220',
    fontWeight: '900',
  },
  detailDescription: {
    color: '#4D586A',
    lineHeight: 22,
  },
  detailMetaGrid: {
    gap: 10,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailMetaText: {
    color: '#566273',
    fontWeight: '700',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionButtonText: {
    color: '#0B1220',
    fontWeight: '900',
  },
  mapPreviewCard: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#DCE7F6',
    minHeight: 200,
  },
  mapPreviewImage: {
    width: '100%',
    height: 220,
  },
  mapPreviewOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(11,18,32,0.56)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapPreviewLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
