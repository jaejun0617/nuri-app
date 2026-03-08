import { StyleSheet } from 'react-native';

export const TIME_WHEEL_ITEM_HEIGHT = 56;
export const TIME_WHEEL_VISIBLE_ROWS = 5;
export const TIME_WHEEL_HEIGHT =
  TIME_WHEEL_ITEM_HEIGHT * TIME_WHEEL_VISIBLE_ROWS;

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: 'rgba(6, 12, 26, 0.34)',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 9,
    borderWidth: 1,
    shadowColor: '#071329',
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 16,
    },
    elevation: 16,
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
  },
  glassGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wheelColumn: {
    flex: 1,
    maxWidth: 132,
  },
  wheelLabel: {
    marginBottom: 4,
    textAlign: 'center',
  },
  wheelFrame: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
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
    borderRadius: 20,
    borderWidth: 1,
  },
  wheelRow: {
    height: TIME_WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginHorizontal: 8,
  },
  wheelText: {
    textAlign: 'center',
  },
  colonText: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
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
