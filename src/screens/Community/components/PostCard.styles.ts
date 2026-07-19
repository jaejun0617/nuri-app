import { StyleSheet } from 'react-native';

import { typography } from '../../../app/theme/tokens/typography';

export const styles = StyleSheet.create({
  row: {
    minHeight: 92,
    paddingLeft: 18,
    paddingRight: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 15,
    justifyContent: 'center',
    gap: 7,
  },
  title: {
    ...typography.role.body,
    fontWeight: '700',
    lineHeight: 22,
  },
  metaRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    ...typography.role.helper,
    lineHeight: 18,
  },
  likeButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  likeText: {
    ...typography.role.helper,
    fontWeight: '600',
  },
  commentRail: {
    width: 54,
    borderLeftWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  commentCount: {
    ...typography.role.body,
    fontWeight: '800',
  },
  commentLabel: {
    ...typography.role.caption,
  },
});
