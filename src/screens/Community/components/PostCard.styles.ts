import { StyleSheet } from 'react-native';

import { typography } from '../../../app/theme/tokens/typography';

export const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  imageTypeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#32A56A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textTypeIcon: {
    width: 18,
    height: 18,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 12,
    paddingRight: 7,
    paddingVertical: 8,
    justifyContent: 'center',
    gap: 2,
  },
  titleRow: {
    minHeight: 20,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    flex: 1,
    minWidth: 0,
    ...typography.role.bodyStrong,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  metaRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    ...typography.role.caption,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  commentRail: {
    width: 42,
    borderLeftWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentCount: {
    ...typography.role.bodySm,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0,
  },
});
