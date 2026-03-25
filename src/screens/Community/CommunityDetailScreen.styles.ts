import { StyleSheet } from 'react-native';
import { typography } from '../../app/theme/tokens/typography';

export const DETAIL_DIVIDER_COLOR = '#00000008';
export const COMMENT_BUBBLE_BEIGE = '#F7F1E8';
export const REPLY_BUBBLE_BEIGE = '#FBF6EF';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerSide: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  stateBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
  stateButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 12,
  },
  postSection: {
    paddingTop: 4,
    paddingBottom: 18,
    gap: 16,
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 16,
  },
  postTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  postTopRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  authorBlock: {
    flex: 1,
    gap: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  authorName: {
    ...typography.role.body,
    fontWeight: '700',
  },
  petAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  petAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextBlock: {
    flex: 1,
    gap: 4,
  },
  petNameLine: {
    ...typography.role.body,
    fontWeight: '600',
  },
  metaLine: {
    ...typography.role.helper,
  },
  categoryBadge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  categoryText: {
    ...typography.role.helper,
    fontWeight: '700',
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  postTitle: {
    ...typography.role.titleLg,
    fontWeight: '700',
  },
  mediaSection: {
    marginTop: 4,
    marginBottom: 6,
  },
  postContent: {
    ...typography.role.body,
  },
  postContentSection: {
    borderTopWidth: 1,
    minHeight: 220,
    paddingTop: 20,
    paddingBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 260,
    borderRadius: 18,
  },
  imageFallback: {
    minHeight: 84,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageFallbackText: {
    ...typography.role.helper,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 2,
    justifyContent: 'space-between',
  },
  actionPill: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPillText: {
    ...typography.role.helper,
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    ...typography.role.helper,
  },
  commentsCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  commentsSection: {
    paddingTop: 6,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: DETAIL_DIVIDER_COLOR,
    marginBottom: 8,
  },
  commentsTitle: {
    ...typography.role.titleSm,
    fontWeight: '700',
  },
  commentsCount: {
    ...typography.role.helper,
  },
  commentsLoading: {
    paddingVertical: 10,
  },
  emptyComments: {
    ...typography.role.bodySm,
  },
  commentItemWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  commentThreadWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 8,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  commentAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBodyWrap: {
    flex: 1,
    minWidth: 0,
  },
  commentMetaRow: {
    marginBottom: 6,
  },
  commentMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  commentMetaText: {
    ...typography.role.helper,
  },
  bestBadge: {
    minHeight: 20,
    borderRadius: 10,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestBadgeText: {
    ...typography.role.caption,
    fontWeight: '700',
  },
  commentBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingLeft: 2,
  },
  commentActionText: {
    ...typography.role.helper,
    fontWeight: '600',
  },
  commentContent: {
    ...typography.role.bodySm,
  },
  replyListWrap: {
    marginTop: 10,
    marginLeft: 2,
    paddingLeft: 4,
    gap: 12,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  replyLead: {
    width: 16,
    alignItems: 'flex-start',
    paddingTop: 14,
    position: 'relative',
  },
  replyLeadLine: {
    width: 12,
    height: 1,
  },
  replyLeadDot: {
    position: 'absolute',
    left: -18,
    top: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  replyAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyContentWrap: {
    flex: 1,
    minWidth: 0,
  },
  replyMetaRow: {
    marginBottom: 5,
  },
  replyMetaText: {
    ...typography.role.helper,
  },
  replyBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  replyContent: {
    ...typography.role.helper,
  },
  replyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 7,
    paddingLeft: 2,
  },
  moreRepliesButton: {
    alignSelf: 'flex-start',
    marginLeft: 10,
    paddingTop: 2,
    minHeight: 28,
    justifyContent: 'center',
  },
  moreRepliesText: {
    ...typography.role.helper,
    fontWeight: '700',
  },
  listFooterWrap: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  listFooterSpacer: {
    height: 8,
  },
  moreCommentsButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  moreCommentsText: {
    ...typography.role.helper,
    fontWeight: '700',
  },
  commentComposerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  replyComposerBanner: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  replyComposerText: {
    flex: 1,
    ...typography.role.helper,
    fontWeight: '600',
  },
  replyComposerCancel: {
    ...typography.role.helper,
    fontWeight: '700',
  },
  commentComposer: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 58,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 96,
    ...typography.role.body,
    paddingTop: 4,
    paddingBottom: 4,
  },
  commentSubmitButton: {
    width: 44,
    height: 44,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  menuScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  menuSheet: {
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 8,
    maxWidth: 320,
    width: '100%',
    alignSelf: 'center',
  },
  menuAction: {
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuDangerAction: {
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  menuActionText: {
    fontWeight: '700',
  },
  reportSheet: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 14,
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
  },
  reportTitle: {
    ...typography.role.titleSm,
    fontWeight: '700',
  },
  reportReasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportReasonButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportReasonText: {
    ...typography.role.helper,
    fontWeight: '700',
  },
  reportInput: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    ...typography.role.bodySm,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  reportActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
