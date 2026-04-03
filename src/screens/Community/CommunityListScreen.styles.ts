import { StyleSheet } from 'react-native';
import { typography } from '../../app/theme/tokens/typography';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerSide: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  errorBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontWeight: '700',
  },
  listContent: {
    flexGrow: 1,
  },
  listWrap: {
    flex: 1,
  },
  postList: {
    flex: 1,
  },
  stickyCategoryHeader: {
    paddingTop: 6,
    paddingBottom: 12,
    zIndex: 2,
  },
  headline: {
    ...typography.role.bodySm,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  categoryLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 20,
    minHeight: 20,
  },
  categoryLoadingText: {
    lineHeight: 18,
  },
  categoryChip: {
    minHeight: 40,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingBottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryChipText: {
    ...typography.role.tab,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  categoryChipUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  listIntroHeader: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  noticeBanner: {
    marginHorizontal: 20,
    marginBottom: 10,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  noticeBannerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  noticeBannerLabel: {
    ...typography.role.helper,
    fontWeight: '700',
    lineHeight: 18,
  },
  noticeBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  noticeBannerActionText: {
    ...typography.role.helper,
    fontWeight: '800',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionHeaderTextBlock: {
    gap: 4,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderLabel: {
    ...typography.role.helper,
    fontWeight: '700',
  },
  sectionHeaderCount: {
    ...typography.role.helper,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyBody: {
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontWeight: '700',
  },
  footerLoading: {
    paddingVertical: 18,
  },
  topButton: {
    position: 'absolute',
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 4,
  },
  createFab: {
    position: 'absolute',
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1220',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 5,
  },
});
