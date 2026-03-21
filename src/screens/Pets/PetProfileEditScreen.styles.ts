import { StyleSheet } from 'react-native';

const BRAND = '#6D6AF8';
const BRAND_DEEP = '#5753E6';
const TEXT = '#0B1220';

const SURFACE = '#F6F7FB';
const CARD = '#EEF1F6';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  keyboardArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 12,
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
  avatarSection: {
    marginTop: 12,
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    width: 156,
    height: 156,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E9D7C1',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECE7DD',
  },
  avatarCameraBtn: {
    position: 'absolute',
    right: 110,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  formSection: {
    gap: 16,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    color: '#8A94A6',
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    color: TEXT,
    fontWeight: '700',
    justifyContent: 'center',
  },
  readonlyInputText: {
    color: TEXT,
    fontWeight: '700',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  inputHint: {
    color: '#A0A7B4',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
    gap: 8,
  },
  searchInputWrap: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontWeight: '700',
  },
  unitText: {
    color: '#8A94A6',
    fontWeight: '800',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentChipWide: {
    flexGrow: 0,
    flexBasis: '31%',
    minWidth: '31%',
    paddingHorizontal: 10,
  },
  segmentChipActive: {
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  segmentChipText: {
    color: '#9AA3B2',
    fontWeight: '800',
  },
  segmentChipTextActive: {
    color: BRAND_DEEP,
    fontWeight: '900',
  },
  quickChip: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipActive: {
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  quickChipText: {
    color: '#8A94A6',
    fontWeight: '800',
  },
  quickChipTextActive: {
    color: BRAND_DEEP,
    fontWeight: '900',
  },
  inlineLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelInlineText: {
    color: '#7B8494',
    fontWeight: '800',
  },
  multilineInput: {
    minHeight: 64,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: 'top',
  },
  tagBox: {
    borderRadius: 18,
    backgroundColor: '#F8F9FC',
    padding: 14,
    gap: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  tagChipText: {
    color: BRAND_DEEP,
    fontWeight: '900',
  },
  tagChipX: {
    color: '#9F8CFB',
    fontWeight: '900',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    color: TEXT,
    fontWeight: '700',
  },
  tagAddButton: {
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  tagAddButtonText: {
    color: BRAND_DEEP,
    fontWeight: '900',
  },
  tagCount: {
    color: '#9AA3B2',
    fontWeight: '800',
  },
  recommendWrap: {
    gap: 10,
  },
  recommendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recommendLabel: {
    color: '#A0A7B4',
    fontWeight: '800',
  },
  recommendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recommendChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recommendChipBlue: {
    backgroundColor: '#DDEEFF',
  },
  recommendChipOrange: {
    backgroundColor: '#FFE7D3',
  },
  recommendChipGreen: {
    backgroundColor: '#DDF5E6',
  },
  recommendChipPink: {
    backgroundColor: '#FFE2F0',
  },
  recommendChipPurple: {
    backgroundColor: '#E8E0FF',
  },
  recommendChipText: {
    color: BRAND_DEEP,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(11,18,32,0.28)',
  },
  modalCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  modalTitle: {
    color: TEXT,
    fontWeight: '800',
  },
  modalDateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalDateInput: {
    flex: 1,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 22,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  footerActionBar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: 'rgba(246,247,251,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(11,18,32,0.06)',
  },
  centerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  fallbackTitle: {
    color: TEXT,
    fontWeight: '800',
  },
});
