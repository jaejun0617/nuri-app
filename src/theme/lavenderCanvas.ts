import { PRODUCT_CANVAS_COLOR } from '../app/theme/tokens/colors';

/** Legacy entry point retained; these screens now share the More menu canvas. */
export const LAVENDER_CANVAS = {
  base: PRODUCT_CANVAS_COLOR,
  statusBar: PRODUCT_CANVAS_COLOR,
  colors: [PRODUCT_CANVAS_COLOR, PRODUCT_CANVAS_COLOR, PRODUCT_CANVAS_COLOR],
  locations: [0, 0.58, 1],
  start: { x: 0, y: 0 },
  end: { x: 0.85, y: 1 },
};
