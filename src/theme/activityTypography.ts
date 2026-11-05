/** Keep the Activity screen's existing 3sp reading adjustment as the shared baseline. */
export const ACTIVITY_READING_INCREASE = 3;
export const ACTIVITY_BASE_TYPE = {
  body: { fontSize: 8, lineHeight: 17 },
  label: { fontSize: 11, lineHeight: 18, fontWeight: '500' as const },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const },
  section: { fontSize: 17, lineHeight: 28, fontWeight: '700' as const },
} as const;

export const ACTIVITY_READING_TYPE = {
  title: ACTIVITY_BASE_TYPE.title,
  section: ACTIVITY_BASE_TYPE.section,
  label: {
    ...ACTIVITY_BASE_TYPE.label,
    fontSize: ACTIVITY_BASE_TYPE.label.fontSize + ACTIVITY_READING_INCREASE,
    lineHeight: ACTIVITY_BASE_TYPE.label.lineHeight + ACTIVITY_READING_INCREASE,
  },
  body: {
    fontSize: ACTIVITY_BASE_TYPE.body.fontSize + ACTIVITY_READING_INCREASE,
    lineHeight: ACTIVITY_BASE_TYPE.body.lineHeight + ACTIVITY_READING_INCREASE,
  },
} as const;
