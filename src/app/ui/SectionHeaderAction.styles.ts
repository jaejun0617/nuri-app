import { StyleSheet } from 'react-native';

import { typography } from '../theme/tokens/typography';

export const styles = StyleSheet.create({
  button: {
    minHeight: 34,
    width: 88,
    flexShrink: 0,
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
    width: 80,
    flexShrink: 0,
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
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 6,
  },
  iconSlot: {
    position: 'absolute',
    right: 5,
    width: 14,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconSlot: {
    position: 'absolute',
    right: 5,
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
