import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderWidth: 1,
    borderColor: '#E7EDF5',
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
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 14,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: '#2F8F48',
    shadowOpacity: 0.08,
  },
  cardPressableArea: {
    gap: 12,
  },
  cardPressableAreaCompact: {
    gap: 10,
  },
  compactCardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardThumbnailWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#DDE5EE',
    minHeight: 132,
  },
  cardThumbnailWrapCompact: {
    width: 112,
    minHeight: 112,
    borderRadius: 16,
    flexShrink: 0,
  },
  cardThumbnail: {
    width: '100%',
    height: 148,
  },
  cardThumbnailCompact: {
    height: 112,
  },
  cardThumbnailPlaceholder: {
    flex: 1,
    minHeight: 132,
    backgroundColor: '#EEF2F5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  cardThumbnailPlaceholderCompact: {
    minHeight: 112,
    paddingHorizontal: 10,
  },
  cardThumbnailPlaceholderIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(122,134,153,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardThumbnailPlaceholderText: {
    color: '#7A8699',
    fontWeight: '800',
    textAlign: 'center',
  },
  cardThumbnailOverlay: {
    position: 'absolute',
    inset: 0,
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(16,32,51,0.12)',
  },
  cardThumbnailOverlayCompact: {
    padding: 10,
    justifyContent: 'flex-end',
  },
  cardThumbnailOverlayFallback: {
    backgroundColor: '#DDE5EE',
  },
  cardThumbnailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeaderCompact: {
    flex: 1,
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
    gap: 4,
  },
  cardCompactMetaBlock: {
    gap: 6,
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
  cardDistanceBadge: {
    color: '#FFFFFF',
    fontWeight: '900',
    backgroundColor: 'rgba(16,32,51,0.62)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cardBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardSourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2F8',
  },
  cardSourceBadgeText: {
    color: '#506074',
    fontWeight: '800',
  },
  cardVerificationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cardVerificationBadgeNeutral: {
    backgroundColor: '#EEF2F8',
  },
  cardVerificationBadgeCaution: {
    backgroundColor: 'rgba(250,107,45,0.12)',
  },
  cardVerificationBadgePositive: {
    backgroundColor: 'rgba(47,143,72,0.12)',
  },
  cardVerificationBadgeCritical: {
    backgroundColor: 'rgba(199,53,79,0.12)',
  },
  cardVerificationBadgeText: {
    fontWeight: '900',
  },
  cardVerificationBadgeTextNeutral: {
    color: '#506074',
  },
  cardVerificationBadgeTextCaution: {
    color: '#D75B23',
  },
  cardVerificationBadgeTextPositive: {
    color: '#23733A',
  },
  cardVerificationBadgeTextCritical: {
    color: '#B42318',
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
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cardPrimaryActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#2F8F48',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cardPrimaryActionText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  cardSecondaryActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cardSecondaryActionButtonSelected: {
    backgroundColor: 'rgba(47,143,72,0.12)',
  },
  cardSecondaryActionText: {
    color: '#506074',
    fontWeight: '900',
  },
  cardSecondaryActionTextSelected: {
    color: '#23733A',
  },
  personalStateSection: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  personalStateLabel: {
    color: '#6B7688',
    fontWeight: '900',
  },
  personalBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  personalBadge: {
    borderRadius: 999,
    backgroundColor: '#E7EDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  personalBadgeText: {
    color: '#455468',
    fontWeight: '800',
  },
  personalStateNote: {
    color: '#6B7688',
    lineHeight: 18,
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
  infoBanner: {
    borderRadius: 18,
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    marginBottom: 12,
  },
  infoBannerTitle: {
    color: '#D75B23',
    fontWeight: '900',
  },
  infoBannerBody: {
    color: '#7A4A30',
    lineHeight: 20,
  },
  verificationBanner: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  verificationBannerNeutral: {
    backgroundColor: '#EEF2F8',
  },
  verificationBannerCaution: {
    backgroundColor: '#FFF4ED',
  },
  verificationBannerPositive: {
    backgroundColor: '#ECFDF3',
  },
  verificationBannerCritical: {
    backgroundColor: '#FEF3F2',
  },
  verificationBannerTitle: {
    fontWeight: '900',
  },
  verificationBannerTitleNeutral: {
    color: '#506074',
  },
  verificationBannerTitleCaution: {
    color: '#D75B23',
  },
  verificationBannerTitlePositive: {
    color: '#23733A',
  },
  verificationBannerTitleCritical: {
    color: '#B42318',
  },
  verificationBannerBody: {
    lineHeight: 20,
  },
  verificationBannerBodyNeutral: {
    color: '#5D6B7C',
  },
  verificationBannerBodyCaution: {
    color: '#7A4A30',
  },
  verificationBannerBodyPositive: {
    color: '#335B3E',
  },
  verificationBannerBodyCritical: {
    color: '#7A271A',
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
  personalSectionCard: {
    borderRadius: 18,
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  personalSectionTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  personalSectionBody: {
    color: '#586678',
    lineHeight: 20,
  },
  personalStatusWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  personalStatusEmpty: {
    color: '#7B8597',
    lineHeight: 19,
  },
  personalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  personalActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#E7EDF5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  personalActionButtonPrimary: {
    backgroundColor: '#DFF1E4',
  },
  personalActionButtonText: {
    color: '#102033',
    fontWeight: '900',
  },
  recentSearchSection: {
    gap: 10,
    marginBottom: 14,
  },
  recentSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recentSearchTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  recentSearchClearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2F8',
  },
  recentSearchClearButtonText: {
    color: '#506074',
    fontWeight: '800',
  },
  recentSearchChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentSearchChip: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8DEEA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recentSearchChipText: {
    color: '#4F5B6B',
    fontWeight: '800',
  },
  recentSearchCaption: {
    color: '#7B8597',
    lineHeight: 18,
  },
  discoveryExperienceShell: {
    flex: 1,
    minHeight: 0,
  },
  resultsPanel: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 12,
  },
  resultsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  resultsPanelTitleWrap: {
    flex: 1,
    gap: 4,
  },
  resultsPanelTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  resultsPanelCaption: {
    color: '#6B7688',
    lineHeight: 18,
  },
  resultsPanelCount: {
    color: '#2F8F48',
    fontWeight: '900',
    paddingTop: 2,
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingHorizontal: 2,
    paddingBottom: 28,
    gap: 14,
  },
  resultsListIntro: {
    gap: 14,
    marginBottom: 14,
  },
  resultsEmptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  resultsLoadingWrap: {
    gap: 12,
    paddingBottom: 16,
  },
  resultsLoadingHeader: {
    paddingHorizontal: 2,
  },
  resultsLoadingText: {
    color: '#6B7688',
    fontWeight: '800',
  },
  resultsLoadingCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F5F7FB',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 14,
  },
  resultsLoadingThumb: {
    width: 108,
    height: 96,
    borderRadius: 14,
    backgroundColor: '#DCE4EF',
    flexShrink: 0,
  },
  resultsLoadingBody: {
    flex: 1,
    gap: 10,
  },
  resultsLoadingLine: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#DCE4EF',
    width: '100%',
  },
  resultsLoadingLineShort: {
    width: '36%',
  },
  resultsLoadingLineMedium: {
    width: '72%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailActionRow: {
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
