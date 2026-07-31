import { StyleSheet } from 'react-native';

import { typography } from '../theme/tokens/typography';

export const styles = StyleSheet.create({
  button: {
    minHeight: 34,
    minWidth: 82,
    paddingHorizontal: 5,
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  text: {
    ...typography.unified.body,
  },
  iconSlot: {
    width: 14,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
