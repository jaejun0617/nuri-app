import { tutorialIds, tutorialCatalog, mergeTutorialStates, parseTutorialProgress } from '../src/services/tutorial/catalog';
import { tutorialMotion, tutorialBlockVisible } from '../src/services/tutorial/motion';
import { observeTutorialInterrupt, interruptTutorial, tutorialInterruptRevision } from '../src/services/tutorial/runtime';
import { responsiveTypographyBand, resolveResponsiveTextStyle } from '../src/app/typography/responsiveTypography';
import { getResponsiveContentWidth } from '../src/services/app/responsiveLayout';
import { getTutorialCapture } from '../src/services/tutorial/captures';

test('the nine stable topics include five automatic guides and no legacy accent setting', () => {
  expect(tutorialIds).toHaveLength(9);
  expect(tutorialIds.filter(id => tutorialCatalog[id].automatic)).toHaveLength(5);
  expect(tutorialIds.map(id => tutorialCatalog[id].steps.length)).toEqual([3, 3, 3, 2, 3, 2, 2, 2, 2]);
  expect(tutorialCatalog.font.title).toBe('앱 글꼴 바꾸기');
});

test('actual crops stay within their image bounds and missing examples stay absent', () => {
  let connected = 0;
  for (const id of tutorialIds) {
    tutorialCatalog[id].steps.forEach((_, index) => {
      const capture = getTutorialCapture(id, index);
      if (!capture) return;
      connected++;
      expect(capture.source).toBeDefined();
      expect(capture.width).toBeGreaterThan(0);
      expect(capture.height).toBeGreaterThan(0);
      if (capture.target) {
        const { left, top, width, height } = capture.target;
        expect(parseFloat(left)).toBeGreaterThanOrEqual(0);
        expect(parseFloat(top)).toBeGreaterThanOrEqual(0);
        expect(parseFloat(width)).toBeGreaterThan(0);
        expect(parseFloat(height)).toBeGreaterThan(0);
        expect(parseFloat(left) + parseFloat(width)).toBeLessThanOrEqual(100);
        expect(parseFloat(top) + parseFloat(height)).toBeLessThanOrEqual(100);
      }
    });
    expect(getTutorialCapture(id, tutorialCatalog[id].steps.length)).toBeUndefined();
  }
  expect(connected).toBeGreaterThan(0);
  expect(getTutorialCapture('record', 2)).toBeUndefined();
  expect(getTutorialCapture('timeline', 2)).toBeDefined();
});

test('an older skip or empty response never demotes completion', () => {
  const completed = { record: 'completed' } as const;
  expect(mergeTutorialStates(completed, {}, { record: 'skipped', home: 'skipped' }))
    .toEqual({ record: 'completed', home: 'skipped' });
  expect(parseTutorialProgress({ eligible: false, states: { other: 'completed' } })).toEqual({ eligible: false, states: {} });
  expect(() => parseTutorialProgress({ eligible: 'unknown', states: {} })).toThrow();
});

test('destination taps interrupt the current generation once per subscribed signal', () => {
  const generation = tutorialInterruptRevision();
  const listener = jest.fn();
  const stop = observeTutorialInterrupt(listener);
  interruptTutorial();
  stop();
  interruptTutorial();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(tutorialInterruptRevision()).toBe(generation + 2);
});

test('the schedule is 800/600ms and partial entry counts inside the scroll viewport', () => {
  expect(tutorialMotion).toEqual({ intervalMs: 800, durationMs: 600, scrollOffsetDp: 10, minVisibleDp: 1 });
  const block = { y: 450, height: 650 };
  expect(tutorialBlockVisible(block, 100, 350)).toBe(false);
  expect(tutorialBlockVisible(block, 101, 350)).toBe(true);
  expect(tutorialBlockVisible(block, 1100, 350)).toBe(false);
  expect(tutorialBlockVisible(block, 1040, 0)).toBe(false);
});

test('global sizes use real inset-adjusted breakpoints without changing fixed or enlarged text', () => {
  const style = { fontSize: 16, lineHeight: 24 };
  expect(getResponsiveContentWidth(384, 12, 12)).toBe(360);
  expect(resolveResponsiveTextStyle(style, responsiveTypographyBand(320, 1))).toEqual({ fontSize: 14, lineHeight: 22 });
  expect(resolveResponsiveTextStyle(style, responsiveTypographyBand(360, 1))).toEqual({ fontSize: 15, lineHeight: 23 });
  for (const width of [384, 599, 600, 720]) {
    expect(resolveResponsiveTextStyle(style, responsiveTypographyBand(width, 1))).toBe(style);
  }
  for (const scale of [Number.NaN, 0, 0.9, 1.3, 2]) {
    expect(resolveResponsiveTextStyle(style, responsiveTypographyBand(320, scale))).toBe(style);
  }
  expect(resolveResponsiveTextStyle(style, 0, true)).toBe(style);
});
