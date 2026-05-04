/**
 * Maps screen coordinates to this SVG's user space (same units as `viewBox`).
 * Same 2D affine math as `SVGPoint.matrixTransform(ctm.inverse())` (no `createSVGPoint` so unit tests work in jsdom).
 */
export const clientToSvgUser = (
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } => {
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return { x: 0, y: 0 };
  }
  const m = ctm.inverse();
  return {
    x: m.a * clientX + m.c * clientY + m.e,
    y: m.b * clientX + m.d * clientY + m.f,
  };
};
