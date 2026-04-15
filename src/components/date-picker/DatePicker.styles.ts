import { StyleSheet } from 'react-native';

export const WHEEL_ITEM_HEIGHT = 50;
export const WHEEL_VISIBLE_ROWS = 5;
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;
export const TIME_PICKER_ITEM_HEIGHT = 42;
export const TIME_PICKER_VISIBLE_ROWS = 3;
export const TIME_PICKER_HEIGHT =
  TIME_PICKER_ITEM_HEIGHT * TIME_PICKER_VISIBLE_ROWS;
export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 14,
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
    borderRadius: 16,
  },
  calendarHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F5F8',
  },
  monthTitleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  calendarBodyScroll: {
    flex: 1,
  },
  calendarBodyContent: {
    gap: 12,
    paddingBottom: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#8A94A6',
    fontWeight: '800',
  },
  sundayText: {
    color: '#E66A8A',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    borderWidth: 1,
    borderColor: '#D6DEE8',
  },
  dayText: {
    color: '#111827',
    fontWeight: '800',
  },
  outMonthText: {
    color: '#C3CAD5',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  dayDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#5B6EE1',
  },
  outMonthDot: {
    backgroundColor: '#D6DEE8',
    opacity: 0.45,
  },
  selectedDayDot: {
    backgroundColor: '#111827',
  },
  selectedPanel: {
    borderTopWidth: 1,
    borderColor: '#E7ECF2',
    paddingTop: 14,
    gap: 12,
  },
  selectedDateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectedDateLeft: {
    flex: 1,
    gap: 3,
  },
  timePickerBlock: {
    borderWidth: 1,
    borderColor: '#E7ECF2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: '#FAFBFD',
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePreviewText: {
    color: '#111827',
    fontWeight: '800',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  periodButtonText: {
    color: '#4B5563',
    fontWeight: '800',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
  },
  timeInputGroup: {
    flex: 1,
    gap: 6,
  },
  timeInput: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E7F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  timeColumn: {
    flex: 1,
    maxWidth: 112,
    gap: 4,
  },
  timeColumnLabel: {
    textAlign: 'center',
    color: '#8A94A6',
    fontWeight: '800',
  },
  timeWheelFrame: {
    position: 'relative',
    overflow: 'hidden',
    height: TIME_PICKER_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E7F0',
    backgroundColor: '#FFFFFF',
  },
  timeWheelHighlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: (TIME_PICKER_HEIGHT - TIME_PICKER_ITEM_HEIGHT) / 2,
    height: TIME_PICKER_ITEM_HEIGHT,
    borderRadius: 8,
    backgroundColor: '#F1F4FF',
    borderWidth: 1,
    borderColor: '#DDE4FF',
  },
  timeWheelList: {
    flexGrow: 0,
    height: TIME_PICKER_HEIGHT,
  },
  timeWheelContent: {
    paddingVertical: (TIME_PICKER_HEIGHT - TIME_PICKER_ITEM_HEIGHT) / 2,
  },
  timeWheelRow: {
    height: TIME_PICKER_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeWheelText: {
    textAlign: 'center',
    fontSize: 18,
  },
  timeColonText: {
    marginBottom: 13,
    color: '#111827',
  },
  disabled: {
    opacity: 0.45,
  },
  headerBlock: {
    gap: 4,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  helperText: {
    lineHeight: 18,
  },
  previewText: {
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputSection: {
    marginTop: 8,
    gap: 6,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputField: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  inputHintRow: {
    minHeight: 18,
    paddingHorizontal: 4,
  },
  errorText: {
    lineHeight: 18,
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
    borderRadius: 12,
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
    borderRadius: 8,
    borderWidth: 1,
  },
  wheelRow: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  glassGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});
