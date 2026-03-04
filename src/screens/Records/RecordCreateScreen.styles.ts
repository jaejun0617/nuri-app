import { StyleSheet } from 'react-native';

const BRAND = '#6D6AF8';
const BRAND_DARK = '#5753E6';
const TEXT = '#111827';
const MUTED = '#97A2B6';
const BORDER = '#E5EAF3';
const BG = '#F7F8FB';
const CARD = '#FFFFFF';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,39,0.04)',
  },
  headerSideBtn: {
    minWidth: 52,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: TEXT,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerCancelText: {
    color: '#C2C9D6',
    fontWeight: '800',
  },
  headerDoneText: {
    color: BRAND,
    fontWeight: '900',
    textAlign: 'right',
  },
  headerDoneTextDisabled: {
    color: '#C8CFDC',
  },

  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },

  dateCard: {
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F1F4F9',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.08)',
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateIconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    color: '#616D82',
    fontWeight: '800',
  },
  dateInput: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    color: TEXT,
  },

  photoBox: {
    marginTop: 20,
    height: 222,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D9E1EE',
    backgroundColor: '#F6F8FC',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  photoIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderTitle: {
    color: '#B0B9C8',
    fontWeight: '800',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlayTop: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },
  photoCounterBadge: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    minWidth: 48,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.56)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCounterText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  photoGhostBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGhostBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  photoThumbRow: {
    marginTop: 10,
    gap: 10,
    paddingHorizontal: 2,
  },
  photoThumbWrap: {
    width: 58,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(17,24,39,0.06)',
    overflow: 'hidden',
  },
  photoThumbWrapActive: {
    borderColor: BRAND,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },

  quickTagRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickTagItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickTagIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTagIconWrapActive: {
    backgroundColor: BRAND,
    shadowColor: BRAND_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  quickTagLabel: {
    color: MUTED,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickTagLabelActive: {
    color: BRAND,
  },
  quickTagHint: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(109,106,248,0.08)',
  },
  quickTagHintText: {
    color: BRAND_DARK,
    fontWeight: '800',
  },
  otherSubRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  otherSubChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherSubChipActive: {
    borderColor: 'rgba(109,106,248,0.22)',
    backgroundColor: 'rgba(109,106,248,0.08)',
  },
  otherSubChipText: {
    color: '#778297',
    fontWeight: '800',
  },
  otherSubChipTextActive: {
    color: BRAND_DARK,
  },
  otherSubClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: {
    marginTop: 24,
    gap: 10,
  },
  fieldLabel: {
    color: TEXT,
    fontWeight: '900',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    width: '23%',
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  moodChipActive: {
    backgroundColor: 'rgba(109,106,248,0.10)',
    borderColor: 'rgba(109,106,248,0.24)',
  },
  moodEmoji: {
    color: '#556070',
    fontWeight: '700',
  },
  moodText: {
    color: '#7B879C',
    fontWeight: '800',
  },
  moodTextActive: {
    color: BRAND_DARK,
  },
  input: {
    minHeight: 42,
    borderRadius: 18,
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: TEXT,
  },
  textArea: {
    minHeight: 130,
    paddingTop: 14,
  },
  helperText: {
    color: '#A2ACBC',
    fontWeight: '700',
  },
  tagSelector: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tagPlaceholder: {
    flex: 1,
    color: '#B5BDCB',
  },
  selectedTagsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  selectedTagText: {
    color: BRAND_DARK,
    fontWeight: '800',
  },

  bottomSubmitBtn: {
    marginTop: 28,
    height: 54,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_DARK,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  bottomSubmitBtnDisabled: {
    backgroundColor: '#C9CFDB',
    shadowOpacity: 0,
    elevation: 0,
  },
  bottomSubmitText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.28)',
  },
  modalDismissZone: {
    flex: 1,
  },
  tagModalCard: {
    backgroundColor: CARD,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  tagModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  tagModalTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  tagModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInputRow: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#F1F4F9',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagModalInput: {
    flex: 1,
    color: TEXT,
    paddingVertical: 12,
  },
  dateShortcutRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  dateShortcutChip: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F4F6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateShortcutChipActive: {
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  dateShortcutText: {
    color: '#95A0B4',
    fontWeight: '800',
  },
  dateShortcutTextActive: {
    color: BRAND_DARK,
  },
  tagSectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: '#9BA6B7',
    fontWeight: '800',
  },
  tagSectionHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagSectionTitleCompact: {
    color: '#9BA6B7',
    fontWeight: '800',
  },
  clearRecentText: {
    color: '#7A71F4',
    fontWeight: '800',
  },
  clearRecentTextDisabled: {
    color: '#C2C9D6',
  },
  tagChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F4F6FB',
  },
  suggestChipText: {
    color: BRAND_DARK,
    fontWeight: '800',
  },
  recentList: {
    gap: 10,
  },
  recentItem: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FBFCFE',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.04)',
  },
  recentItemText: {
    color: '#697488',
    fontWeight: '800',
  },
  selectedModalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  selectedModalChipText: {
    color: BRAND_DARK,
    fontWeight: '800',
  },
  addTagBtn: {
    marginTop: 24,
    height: 50,
    borderRadius: 25,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
