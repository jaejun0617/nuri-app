import { StyleSheet } from 'react-native';

export const WHEEL_ITEM_HEIGHT = 50;
export const WHEEL_VISIBLE_ROWS = 5;
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;

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
    gap: 8,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pickerWrap: {
    position: 'relative',
    flexDirection: 'row',
    gap: 4,
    minHeight: WHEEL_HEIGHT,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'stretch',
  },
  pickerMiniColumn: {
    flex: 0.7,
  },
  pickerLabel: {
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
    height: WHEEL_HEIGHT,
  },
  wheelContent: {
    paddingVertical: (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2,
  },
  wheelCenterHighlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 18,
    borderWidth: 1,
  },
  wheelRow: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    marginHorizontal: 8,
  },
  wheelText: {
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
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
  glassGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
});
