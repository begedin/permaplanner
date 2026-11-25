// Each boundary limits a change in width and height: w * dw + h * dh <= limit.
export type ResizeLimit = { w: number; h: number; limit: number };

const intersection = (a: ResizeLimit, b: ResizeLimit) => {
  const cross = a.w * b.h - a.h * b.w;
  return {
    width: (b.h * a.limit - a.h * b.limit) / cross,
    height: (a.w * b.limit - b.w * a.limit) / cross,
  };
};

export const compileResizeLimits = (limits: ResizeLimit[]) => {
  if (limits.every((edge) => edge.w === 0 || edge.h === 0)) {
    let minWidth = -Infinity;
    let maxWidth = Infinity;
    let minHeight = -Infinity;
    let maxHeight = Infinity;
    for (const edge of limits) {
      if (edge.w > 0) maxWidth = Math.min(maxWidth, edge.limit);
      else if (edge.w < 0) minWidth = Math.max(minWidth, -edge.limit);
      else if (edge.h > 0) maxHeight = Math.min(maxHeight, edge.limit);
      else minHeight = Math.max(minHeight, -edge.limit);
    }
    return (width: number, height: number) => ({
      width: Math.max(minWidth, Math.min(width, maxWidth)),
      height: Math.max(minHeight, Math.min(height, maxHeight)),
    });
  }

  // The rotated map edges enclose a convex polygon of permitted sizes.
  // Visit the boundaries in angle order. Drop a boundary when the next one
  // cuts off its last intersection with the polygon.
  const sorted = limits
    .map((edge) => ({ ...edge, angle: Math.atan2(edge.h || 0, edge.w) }))
    .sort((a, b) => a.angle - b.angle || a.limit - b.limit);
  const distinct: typeof sorted = [];
  for (const edge of sorted) {
    const previous = distinct.at(-1);
    if (previous && edge.angle - previous.angle < 1e-12) {
      if (edge.limit < previous.limit) distinct[distinct.length - 1] = edge;
    } else distinct.push(edge);
  }
  const outside = (edge: ResizeLimit, a: ResizeLimit, b: ResizeLimit) => {
    const p = intersection(a, b);
    return edge.w * p.width + edge.h * p.height > edge.limit + 1e-9;
  };
  const edges: ResizeLimit[] = [];
  let first = 0;
  for (const edge of distinct) {
    while (edges.length - first >= 2 && outside(edge, edges.at(-2)!, edges.at(-1)!))
      edges.pop();
    while (edges.length - first >= 2 && outside(edge, edges[first]!, edges[first + 1]!))
      first++;
    edges.push(edge);
  }
  while (
    edges.length - first >= 3 &&
    outside(edges[first]!, edges.at(-2)!, edges.at(-1)!)
  )
    edges.pop();
  while (
    edges.length - first >= 3 &&
    outside(edges.at(-1)!, edges[first]!, edges[first + 1]!)
  )
    first++;
  const boundary = edges.slice(first);
  const corners = boundary.map((edge, i) =>
    intersection(edge, boundary[(i + 1) % boundary.length]!),
  );
  return (width: number, height: number) => {
    if (boundary.every((edge) => edge.w * width + edge.h * height <= edge.limit + 1e-9))
      return { width, height };
    // The closest permitted size lies on one of the polygon's segments.
    let closest = corners[0]!;
    let shortest = Infinity;
    for (const [i, start] of corners.entries()) {
      const end = corners[(i + 1) % corners.length]!;
      const dw = end.width - start.width;
      const dh = end.height - start.height;
      const lengthSquared = dw * dw + dh * dh;
      const t = lengthSquared
        ? Math.max(
            0,
            Math.min(
              1,
              ((width - start.width) * dw + (height - start.height) * dh) / lengthSquared,
            ),
          )
        : 0;
      const w = start.width + t * dw;
      const h = start.height + t * dh;
      const distance = (w - width) ** 2 + (h - height) ** 2;
      if (distance < shortest) {
        closest = { width: w, height: h };
        shortest = distance;
      }
    }
    return closest;
  };
};
