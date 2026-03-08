import { StyleSheet } from 'react-native';

export const TIME_WHEEL_ITEM_HEIGHT = 56;
export const TIME_WHEEL_VISIBLE_ROWS = 5;
export const TIME_WHEEL_HEIGHT =
  TIME_WHEEL_ITEM_HEIGHT * TIME_WHEEL_VISIBLE_ROWS;

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
    backgroundColor: 'transparent',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 14,
    borderWidth: 1,
    shadowColor: '#071329',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 14,
  },
  glassGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  wheelColumn: {
    flex: 1,
    maxWidth: 132,
  },
  wheelLabel: {
    marginBottom: 8,
    textAlign: 'center',
  },
  wheelFrame: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
  },
  wheelList: {
    flexGrow: 0,
    height: TIME_WHEEL_HEIGHT,
  },
  wheelContent: {
    paddingVertical: (TIME_WHEEL_HEIGHT - TIME_WHEEL_ITEM_HEIGHT) / 2,
  },
  wheelCenterHighlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: (TIME_WHEEL_HEIGHT - TIME_WHEEL_ITEM_HEIGHT) / 2,
    height: TIME_WHEEL_ITEM_HEIGHT,
    borderRadius: 18,
    borderWidth: 1,
  },
  wheelRow: {
    height: TIME_WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    marginHorizontal: 8,
  },
  wheelText: {
    textAlign: 'center',
  },
  colonText: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
