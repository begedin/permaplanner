import { expect, it, vi } from 'vitest';

import { clientToSvgUser } from './svgClientToUser';

type Inv = { a: number; b: number; c: number; d: number; e: number; f: number };

const svgWithInverse = (inv: Inv | null) => {
  const svg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  ) as SVGSVGElement;
  svg.getScreenCTM = vi.fn(() =>
    inv === null
      ? null
      : ({
          inverse: () => inv,
        } as DOMMatrix),
  );
  return svg;
};

it('returns (0,0) when getScreenCTM is null', () => {
  expect(clientToSvgUser(svgWithInverse(null), 10, 20)).toEqual({ x: 0, y: 0 });
});

it('maps screen points with the inverse of the screen CTM', () => {
  const inv: Inv = { a: 0.5, b: 0, c: 0, d: 0.5, e: -50, f: -25 };
  expect(clientToSvgUser(svgWithInverse(inv), 110, 70)).toEqual({ x: 5, y: 10 });
});

it('identity inverse maps client coordinates to the same user coordinates', () => {
  const inv: Inv = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  expect(clientToSvgUser(svgWithInverse(inv), 333, 444)).toEqual({ x: 333, y: 444 });
});
