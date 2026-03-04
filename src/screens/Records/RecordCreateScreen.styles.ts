import { StyleSheet } from 'react-native';

const TEXT = '#0B1220';
const BORDER = '#E6E8F0';
const BG = '#F6F7FB';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  title: { marginBottom: 10, color: TEXT, fontWeight: '900' },

  imagePicker: {
    height: 160,
    borderRadius: 18,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  imagePickerText: { color: '#333333', fontWeight: '700' },
  image: { width: '100%', height: '100%' },

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

  emotionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { borderColor: TEXT },
  chipText: { color: TEXT, fontWeight: '700' },

  primary: {
    marginTop: 16,
    backgroundColor: TEXT,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
});
