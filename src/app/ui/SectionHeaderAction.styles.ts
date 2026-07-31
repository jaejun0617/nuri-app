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
  compactButton: {
    minHeight: 28,
    minWidth: 70,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
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
  compactIconSlot: {
    width: 12,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
