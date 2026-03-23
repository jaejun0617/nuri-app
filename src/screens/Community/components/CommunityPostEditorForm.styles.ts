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
  linkedPetPreview: {
    flex: 1,
    minHeight: 64,
    minWidth: 0,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkedPetAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  linkedPetAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedPetAvatarFallbackText: {
    fontWeight: '800',
  },
  linkedPetInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  linkedPetName: {
    fontWeight: '700',
  },
  linkedPetMeta: {
    lineHeight: 18,
  },
  linkedPetMetaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    gap: 10,
  },
  ageToggleButton: {
    minHeight: 40,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  ageToggleText: {
    fontWeight: '700',
  },
  petHintText: {
    lineHeight: 18,
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
