export type PathBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const pathBounds = (path: { x: number; y: number }[]): PathBounds => {
  if (path.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const minX = Math.min(...path.map((p) => p.x));
  const minY = Math.min(...path.map((p) => p.y));
  const maxX = Math.max(...path.map((p) => p.x));
  const maxY = Math.max(...path.map((p) => p.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

/** Physical map dimensions (same units as the scale line), e.g. `1.25×3.00`. */
export const formatGuildMapDimensions = (
  bounds: PathBounds,
  unitLengthPx: number,
): string | null => {
  if (bounds.width <= 0 || bounds.height <= 0 || unitLengthPx <= 0) {
    return null;
  }
  const w = (bounds.width / unitLengthPx).toFixed(2);
  const h = (bounds.height / unitLengthPx).toFixed(2);
  return `${w}×${h}`;
};
