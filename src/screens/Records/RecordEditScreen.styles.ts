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
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontWeight: '900', color: TEXT },
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

  emotionRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { borderColor: BRAND, backgroundColor: 'rgba(109,124,255,0.10)' },
  chipText: { color: TEXT, fontWeight: '700' },

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
});
