import { StyleSheet } from 'react-native';
import { typography } from '../../../app/theme/tokens/typography';

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
    flex: 1,
    ...typography.role.helper,
    fontWeight: '600',
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
    ...typography.role.helper,
    fontWeight: '600',
  },
  petSubMetaText: {
    ...typography.role.helper,
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
    ...typography.role.caption,
    fontWeight: '700',
  },
  bodySection: {
    gap: 6,
    marginBottom: 12,
  },
  titleText: {
    ...typography.role.body,
    fontWeight: '700',
  },
  previewText: {
    ...typography.role.helper,
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
    ...typography.role.helper,
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
    ...typography.role.helper,
  },
  likeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 24,
  },
  likeActionText: {
    ...typography.role.helper,
  },
});
