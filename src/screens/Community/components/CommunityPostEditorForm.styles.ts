import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  label: {
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontWeight: '700',
  },
  policyHelperBox: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  policyHelperContent: {
    gap: 6,
  },
  policyHelperTitle: {
    fontWeight: '800',
  },
  policyHelperBody: {
    lineHeight: 20,
  },
  policyHelperAction: {
    alignSelf: 'flex-end',
  },
  policyHelperActionText: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  bodyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    lineHeight: 18,
  },
  titleInputShell: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  titleInput: {
    fontSize: 16,
    lineHeight: 22,
    padding: 0,
    fontWeight: '600',
  },
  inputShell: {
    minHeight: 220,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    minHeight: 188,
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 10,
  },
  thumbnailWrap: {
    flex: 1,
    aspectRatio: 1,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSubmitButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  bottomSubmitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  bottomSubmitText: {
    fontWeight: '800',
  },
});
