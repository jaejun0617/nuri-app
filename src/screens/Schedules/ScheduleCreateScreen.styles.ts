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
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 26,
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
  headerDoneBtn: {
    minWidth: 44,
    height: 34,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerDoneText: {
    color: BRAND,
    fontWeight: '900',
  },

  card: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  label: {
    marginTop: 12,
    marginBottom: 8,
    color: MUTED,
    fontWeight: '800',
  },
  input: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: TEXT,
    backgroundColor: '#F7F8FC',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.08)',
  },
  pickerField: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F7F8FC',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerFieldDisabled: {
    opacity: 0.55,
  },
  pickerFieldText: {
    color: TEXT,
    fontWeight: '700',
  },
  pickerFieldTextDisabled: {
    color: MUTED,
  },
  textarea: {
    height: 110,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  timeCol: {
    flex: 1,
  },
  allDayChip: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F9',
  },
  allDayChipActive: {
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  allDayChipText: {
    color: MUTED,
    fontWeight: '800',
  },
  allDayChipTextActive: {
    color: BRAND,
  },

  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F7F8FC',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  optionChipActive: {
    backgroundColor: 'rgba(109,106,248,0.10)',
    borderColor: 'rgba(109,106,248,0.18)',
  },
  optionChipText: {
    color: MUTED,
    fontWeight: '800',
  },
  optionChipTextActive: {
    color: BRAND,
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  iconCard: {
    width: 78,
    minHeight: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F7F8FC',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  iconCardActive: {
    backgroundColor: 'rgba(109,106,248,0.10)',
    borderColor: 'rgba(109,106,248,0.18)',
  },
  iconLabel: {
    color: MUTED,
    fontWeight: '700',
    fontSize: 11,
  },
  iconLabelActive: {
    color: BRAND,
  },

  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#DAD8FF',
  },
  colorLabel: {
    color: MUTED,
    fontWeight: '700',
  },

  primaryBtn: {
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.34)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: SURFACE,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4FA',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F7F8FC',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  presetChipText: {
    color: MUTED,
    fontWeight: '800',
  },
  modalInput: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: TEXT,
    backgroundColor: '#F7F8FC',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.08)',
  },
  modalConfirmBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
