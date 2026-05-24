import { expect, it } from 'vitest';

import { ICON_CANVAS, ICON_FILL_SCALE, ICON_SYMBOL_TRANSFORM } from './iconGeometry';

it('uses a 48×48 canvas with a centered fill scale', () => {
  expect(ICON_CANVAS).toBe(48);
  expect(ICON_FILL_SCALE).toBe(1.35);
  expect(ICON_SYMBOL_TRANSFORM).toBe('translate(24 24) scale(1.35) translate(-24 -24)');
});
