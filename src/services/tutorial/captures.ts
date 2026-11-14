import type { ImageSourcePropType } from 'react-native';
import type { TutorialId } from './catalog';

type Target = Readonly<{ x: number; y: number; width: number; height: number }>;
type Percent = `${number}%`;
export type TutorialCapture = Readonly<{
  source: ImageSourcePropType;
  width: number;
  height: number;
  target?: Readonly<{ left: Percent; top: Percent; width: Percent; height: Percent }>;
}>;

// Target coordinates belong to the shipped crop, not the full screenshot or device.
const ratio = (value: number, length: number): Percent => `${(value / length) * 100}%`;
function shot(source: ImageSourcePropType, width: number, height: number, target?: Target): TutorialCapture {
  return {
    source, width, height,
    target: target && {
      left: ratio(target.x, width), top: ratio(target.y, height),
      width: ratio(target.width, width), height: ratio(target.height, height),
    },
  };
}

const fontSource = require('../../assets/tutorial/captures/font-compare.webp');
export const recordDateCapture = shot(require('../../assets/tutorial/captures/record-date.webp'), 758, 116);
const captures: Partial<Record<TutorialId, Partial<Record<number, TutorialCapture>>>> = {
  home: { 2: shot(require('../../assets/tutorial/captures/home-more.webp'), 780, 130, { x: 632, y: 20, width: 140, height: 105 }) },
  record: {
    0: shot(require('../../assets/tutorial/captures/record-category.webp'), 758, 226),
    1: shot(require('../../assets/tutorial/captures/record-fields.webp'), 758, 792, { x: 7, y: 586, width: 742, height: 104 }),
  },
  timeline: {
    0: shot(require('../../assets/tutorial/captures/timeline-month.webp'), 768, 234, { x: 16, y: 124, width: 738, height: 105 }),
    1: shot(require('../../assets/tutorial/captures/timeline-kind.webp'), 760, 220, { x: 11, y: 122, width: 738, height: 81 }),
    2: shot(require('../../assets/tutorial/captures/timeline-grid-view.webp'), 768, 266, { x: 2, y: 80, width: 186, height: 184 }),
  },
  'schedule-list': {
    0: shot(require('../../assets/tutorial/captures/schedule-menu.webp'), 768, 134, { x: 14, y: 9, width: 355, height: 117 }),
    1: shot(require('../../assets/tutorial/captures/schedule-search.webp'), 780, 272, { x: 4, y: 15, width: 772, height: 104 }),
  },
  'schedule-create': {
    0: shot(require('../../assets/tutorial/captures/schedule-name.webp'), 760, 190, { x: 19, y: 59, width: 722, height: 115 }),
    1: shot(require('../../assets/tutorial/captures/schedule-date.webp'), 624, 836),
    2: shot(require('../../assets/tutorial/captures/schedule-save.webp'), 623, 675, { x: 8, y: 565, width: 607, height: 91 }),
  },
  'record-edit': {
    0: shot(require('../../assets/tutorial/captures/record-edit-action.webp'), 750, 234, { x: 2, y: 102, width: 744, height: 125 }),
    1: shot(require('../../assets/tutorial/captures/record-edit-save.webp'), 750, 178, { x: 11, y: 50, width: 728, height: 101 }),
  },
  font: {
    0: shot(fontSource, 750, 510),
    1: shot(fontSource, 750, 510, { x: 648, y: 384, width: 61, height: 61 }),
  },
};

export function getTutorialCapture(topic: TutorialId, index: number): TutorialCapture | undefined {
  return captures[topic]?.[index];
}
