import { replyIntersectsViewport } from '../src/screens/SupportIsolation/replyViewport';

test('layout alone, offscreen edges and a sliver cannot confirm a read', () => {
  expect(replyIntersectsViewport(750, 100, 0, 720)).toBe(false);
  expect(replyIntersectsViewport(720, 100, 0, 720)).toBe(false);
  expect(replyIntersectsViewport(710, 100, 0, 720)).toBe(false);
  expect(replyIntersectsViewport(0, 0, 0, 720)).toBe(false);
  expect(replyIntersectsViewport(0, 100, 0, 0)).toBe(false);
});

test('scrolling to the target does not also acknowledge the following reply', () => {
  expect(replyIntersectsViewport(760, 860, 610, 720)).toBe(true);
  expect(replyIntersectsViewport(1620, 70, 610, 720)).toBe(false);
  expect(replyIntersectsViewport(760, 860, 850, 720)).toBe(true);
  expect(replyIntersectsViewport(1620, 70, 1640, 720)).toBe(false);
});
