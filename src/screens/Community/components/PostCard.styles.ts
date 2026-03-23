import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  rowCard: {
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerRow: {
    marginBottom: 14,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 24,
  },
  authorMeta: {
    fontWeight: '600',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  petMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  petNameText: {
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
  petSubMetaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  categoryChip: {
    minHeight: 24,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bodySection: {
    gap: 6,
    marginBottom: 12,
  },
  titleText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  previewText: {
    fontSize: 13,
    lineHeight: 21,
  },
  commentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 22,
    marginBottom: 12,
  },
  commentPreviewConnector: {
    width: 12,
    height: 12,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    marginLeft: 2,
    marginRight: 2,
    marginBottom: 6,
  },
  commentPreviewAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  commentPreviewAvatarFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentPreviewText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerMetaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  likeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 24,
  },
  likeActionText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
