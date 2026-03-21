// 파일: src/screens/Records/RecordEditScreen.styles.ts
// 목적:
// - RecordEditScreen 스타일 분리 (화이트 + 퍼플 톤)

import { StyleSheet } from 'react-native';

const BRAND = '#6D7CFF';
const TEXT = '#0B1220';
const BORDER = '#E6E8F0';
const BG = '#F6F7FB';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 28 },

  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
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
  backBtn: {
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

  card: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },

  // image
  heroWrap: { marginBottom: 12 },
  heroImg: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  heroPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: { color: '#8A94A6', fontWeight: '800' },
  thumbRow: {
    marginTop: 10,
    gap: 8,
    paddingHorizontal: 2,
  },
  thumbItem: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F1F4F9',
  },
  thumbItemActive: {
    borderColor: BRAND,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },

  imgActionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  imgBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgBtnPrimary: {
    borderColor: 'rgba(109,124,255,0.25)',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  imgBtnDanger: {
    borderColor: 'rgba(255,77,79,0.20)',
    backgroundColor: 'rgba(255,77,79,0.10)',
  },
  imgBtnText: { color: TEXT, fontWeight: '900' },
  imgBtnDangerText: { color: '#FF4D4F', fontWeight: '900' },

  // form
  label: {
    marginTop: 10,
    marginBottom: 6,
    color: '#556070',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    color: TEXT,
    backgroundColor: '#FFFFFF',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  categoryGrid: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    borderColor: 'rgba(109,124,255,0.24)',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  categoryChipText: {
    color: '#7B879C',
    fontWeight: '800',
  },
  categoryChipTextActive: {
    color: BRAND,
  },
  subCategoryGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  subCategoryChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCategoryChipActive: {
    borderColor: 'rgba(109,124,255,0.24)',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  subCategoryChipText: {
    color: '#7B879C',
    fontWeight: '800',
  },
  subCategoryChipTextActive: {
    color: BRAND,
  },
  subCategoryClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    marginTop: 8,
    color: '#7B879C',
    fontWeight: '700',
  },

  emotionGrid: {
    marginTop: 8,
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
    backgroundColor: 'rgba(109,124,255,0.10)',
    borderColor: 'rgba(109,124,255,0.24)',
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
    color: BRAND,
  },

  primary: {
    marginTop: 14,
    backgroundColor: BRAND,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },

  ghost: { marginTop: 10, paddingVertical: 8, alignItems: 'center' },
  ghostText: { color: '#556070', fontWeight: '700' },

  desc: { marginTop: 8, color: '#556070' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,18,32,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(109,124,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#0B1220',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    color: '#8A94A6',
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 20,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6D6AF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#5D57E8',
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
