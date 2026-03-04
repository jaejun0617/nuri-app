import { StyleSheet } from 'react-native';

const BRAND = '#6D6AF8';
const BRAND_DEEP = '#5A57E7';
const TEXT = '#1B2230';
const MUTED = '#8D96A8';
const SURFACE = '#F6F7FB';
const CARD = '#FFFFFF';
const FIELD = '#F4F6FB';
const BORDER = 'rgba(109,106,248,0.16)';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  header: {
    minHeight: 25,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
  },
  headerAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionPlaceholder: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  progressMain: {
    flex: 1,
  },
  progressLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.14)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BRAND,
  },
  progressFillHalf: {
    width: '50%',
  },
  progressFillFull: {
    width: '100%',
  },
  progressStepText: {
    color: BRAND,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
    gap: 14,
    shadowColor: '#0A0F1C',
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarCircle: {
    width: 116,
    height: 116,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(109,106,248,0.38)',
    backgroundColor: '#F9F8FF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditButton: {
    position: 'absolute',
    right: 120,
    bottom: 4,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: BRAND,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    textAlign: 'center',
    color: '#4C5568',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  fieldBlock: {
    gap: 7,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    color: '#778195',
    fontSize: 12,
    fontWeight: '800',
  },
  countText: {
    color: '#9CA5B6',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: FIELD,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  iconInputWrap: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: FIELD,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconInput: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 12,
  },
  trailingUnit: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
  },
  inputHint: {
    color: '#A0A7B4',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
    gap: 7,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: FIELD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentChipActive: {
    backgroundColor: 'rgba(109,106,248,0.12)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  segmentChipText: {
    color: '#9AA3B4',
    fontSize: 12,
    fontWeight: '800',
  },
  segmentChipTextActive: {
    color: BRAND_DEEP,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
  },
  inlineAddButton: {
    minWidth: 62,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(109,106,248,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  inlineAddButtonText: {
    color: BRAND_DEEP,
    fontSize: 13,
    fontWeight: '900',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.1)',
  },
  pillText: {
    color: BRAND_DEEP,
    fontSize: 12,
    fontWeight: '800',
  },
  pillX: {
    color: '#9D95FF',
    fontSize: 12,
    fontWeight: '900',
  },
  footerActions: {
    gap: 10,
    paddingBottom: 6,
  },
  primaryButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ECEFFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: BRAND_DEEP,
    fontSize: 13,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.46,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.28)',
  },
  dateModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateModalTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  dateModalPreview: {
    color: BRAND_DEEP,
    fontSize: 14,
    fontWeight: '800',
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerCol: {
    flex: 1.4,
    gap: 7,
  },
  datePickerMiniCol: {
    flex: 1,
    gap: 7,
  },
  datePickerLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
  },
  datePickerInput: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: FIELD,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  dateModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  dateGhostButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF1F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateGhostButtonText: {
    color: '#6C768A',
    fontSize: 13,
    fontWeight: '800',
  },
  dateConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
