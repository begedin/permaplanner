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
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of path) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const formatGuildMapDimensions = (
  bounds: PathBounds,
  { pixelsPerUnit, unit }: { pixelsPerUnit: number; unit: string },
): string | null => {
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const w = (bounds.width / pixelsPerUnit).toFixed(2);
  const h = (bounds.height / pixelsPerUnit).toFixed(2);
  return `${w}×${h} ${unit}`;
};
