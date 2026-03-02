// 파일: src/screens/Pets/PetCreateScreen.styles.ts
// 목적:
// - PetCreateScreen 전용 스타일 분리
// - 입력폼/칩/버튼 모바일 기준 정리

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  header: {
    marginBottom: 14,
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1D1B19',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6660',
    lineHeight: 17,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    gap: 12,
  },

  imagePicker: {
    height: 160,
    borderRadius: 18,
    backgroundColor: '#F3EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePickerText: {
    color: '#7A726C',
    fontSize: 13,
    fontWeight: '800',
  },
  image: { width: '100%', height: '100%' },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E6660',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3EEE8',
    paddingHorizontal: 12,
    color: '#1D1B19',
    fontWeight: '700',
  },
  inputHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A827C',
    marginTop: 6,
    lineHeight: 15,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: { flex: 1 },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3EEE8',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  chipActive: {
    backgroundColor: '#97A48D',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3A3531',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // multi-value input (likes/dislikes/hobbies/tags)
  multiBox: {
    borderRadius: 14,
    backgroundColor: '#F3EEE8',
    padding: 12,
    gap: 10,
  },
  multiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  multiCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A827C',
  },
  miniAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  miniAddBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1D1B19',
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D1B19',
  },
  pillX: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7A726C',
  },

  primary: {
    marginTop: 6,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  ghost: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { fontSize: 13, fontWeight: '800', color: '#7A726C' },
});
