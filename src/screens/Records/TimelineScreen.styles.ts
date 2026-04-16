// 파일: src/screens/Records/TimelineScreen.styles.ts

import { StyleSheet } from 'react-native';
import { SCREEN_TOP_SPACING } from '../../theme/layout';

const BRAND = '#6D6AF8';
const TEXT = '#0B1220';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  guestGateWrap: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
  },

  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  headerSideSlot: {
    width: 88,
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
    color: TEXT,
    fontWeight: '900',
  },

  createBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  // sticky controls
  controlsWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: SCREEN_TOP_SPACING,
    paddingBottom: 8,
    gap: 8,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  controlChip: {
    minHeight: 36,
    paddingHorizontal: 6,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  controlChipText: { color: BRAND, fontWeight: '800' },
  controlChipTextInactive: { color: '#9AA0A9', fontWeight: '700' },
  controlChipUnderline: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 0,
    height: 3,
    borderRadius: 999,
  },

  iconBtn: {
    width: 38,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  iconText: { color: TEXT },

  // category row
  categoryRow: {
    marginTop: 2,
  },
  categoryContent: {
    paddingRight: 18,
    gap: 2,
    alignItems: 'center',
  },
  categoryChip: {
    minHeight: 40,
    paddingHorizontal: 6,
    paddingBottom: 4,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryChipActive: {},
  categoryChipText: { color: '#8A8A8A', fontWeight: '700' },
  categoryChipTextActive: { fontWeight: '800' },
  categoryChipUnderline: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 0,
    height: 3,
    borderRadius: 999,
  },

  // search
  searchBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    color: TEXT,
    backgroundColor: '#FFFFFF',
  },
  clearBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { color: '#FFFFFF', fontWeight: '900' },

  hintRow: {},
  hintText: { color: '#6B7280', fontWeight: '800' },

  heatmapWrap: {
    marginHorizontal: 14,
    marginTop: 2,
    marginBottom: 10,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FAFAFF',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.10)',
    gap: 12,
  },
  heatmapHeader: {
    flex: 1,
    gap: 4,
  },
  heatmapToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heatmapEyebrow: {
    color: BRAND,
    fontWeight: '900',
  },
  heatmapTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  heatmapDesc: {
    color: '#6B7280',
    fontWeight: '700',
    lineHeight: 17,
  },
  heatmapGridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  heatmapLabelsCol: {
    paddingTop: 1,
    gap: 6,
  },
  heatmapDayLabel: {
    width: 14,
    height: 14,
    color: '#9CA3AF',
    fontWeight: '800',
    fontSize: 10,
    textAlign: 'center',
  },
  heatmapWeeksRow: {
    gap: 6,
  },
  heatmapWeekCol: {
    gap: 6,
  },
  heatmapCell: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.06)',
  },
  heatmapCell0: {
    backgroundColor: '#EFF1F6',
  },
  heatmapCell1: {
    backgroundColor: 'rgba(109,106,248,0.18)',
  },
  heatmapCell2: {
    backgroundColor: 'rgba(109,106,248,0.36)',
  },
  heatmapCell3: {
    backgroundColor: 'rgba(109,106,248,0.58)',
  },
  heatmapCell4: {
    backgroundColor: '#6D6AF8',
  },
  heatmapCellMuted: {
    opacity: 0.45,
  },
  heatmapCellToday: {
    borderColor: '#4338CA',
    borderWidth: 1.5,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  heatmapLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  heatmapLegendText: {
    color: '#9CA3AF',
    fontWeight: '800',
  },

  list: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 18 },
  listEmpty: { flexGrow: 1, padding: 18 },

  item: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 0,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dateGroupHeaderRail: {
    width: 14,
    alignItems: 'center',
    position: 'relative',
    paddingTop: 8,
  },
  dateGroupHeaderLine: {
    position: 'absolute',
    top: -12,
    bottom: -8,
    width: 1.5,
    borderRadius: 999,
  },
  dateGroupHeaderDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  dateGroupHeaderText: {
    gap: 2,
  },
  dateGroupHeaderTitleToday: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  dateGroupHeaderTitlePast: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  dateGroupHeaderSubtitle: {
    color: '#8A94A3',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
    paddingBottom: 6,
  },
  itemRail: {
    width: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  itemRailLine: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    width: 1.5,
    borderRadius: 999,
  },
  itemRailDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F6F7F9',
  },
  thumbImg: { width: '100%', height: '100%', borderRadius: 14 },
  thumbTimeline: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F6F7F9',
  },
  thumbTimelineImg: { width: '100%', height: '100%', borderRadius: 20 },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  thumbTimelinePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  thumbPlaceholderText: { color: '#888888', fontWeight: '800' },

  itemBody: {
    flex: 1,
    minHeight: 60,
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 10,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCategoryChip: {
    minHeight: 24,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 88,
  },
  itemCategoryChipText: {
    fontWeight: '700',
  },
  itemTitle: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  itemContent: { marginTop: 4, color: '#374151' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: {
    color: '#7A8594',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 17,
  },

  badge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  badgeText: { color: BRAND, fontWeight: '900' },

  tags: { marginTop: 8, color: TEXT, fontWeight: '800' },

  empty: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyHero: {
    width: 220,
    height: 220,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPawImage: {
    width: 200,
    height: 200,
  },
  emptyTitle: {
    color: TEXT,
    fontWeight: '900',
    marginTop: -6,
  },
  emptyDesc: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 2,
  },

  primary: {
    marginTop: 14,
    minWidth: 210,
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 24,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryIcon: { color: '#FFFFFF', fontWeight: '900' },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },

  footer: {
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: { color: '#6B7280', fontWeight: '800' },

  manualMoreBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualMoreText: { color: TEXT, fontWeight: '900' },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  modalTitle: { color: TEXT, fontWeight: '900', marginBottom: 10 },

  modalItem: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalItemText: { color: TEXT, fontWeight: '900' },
});
