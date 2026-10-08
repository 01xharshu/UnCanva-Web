import { Stroke } from "./document";
/** Apply opacity once to a whole stroke; overlapping dabs do not over-erase. */
export function applyStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points.length) return;
  const rx = stroke.size / 2,
    aspect = stroke.aspect || 1,
    ry = rx * aspect;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of stroke.points) {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  }
  const left = Math.max(0, Math.floor(minX - rx - 1)),
    top = Math.max(0, Math.floor(minY - ry - 1)),
    right = Math.min(ctx.canvas.width, Math.ceil(maxX + rx + 1)),
    bottom = Math.min(ctx.canvas.height, Math.ceil(maxY + ry + 1));
  if (right <= left || bottom <= top) return;
  const c = document.createElement("canvas");
  c.width = right - left;
  c.height = bottom - top;
  const paint = c.getContext("2d")!;
  for (let n = 0; n < stroke.points.length; n++) {
    const p = stroke.points[n],
      prev = stroke.points[n - 1] || p,
      steps = Math.max(
        1,
        Math.ceil(
          Math.hypot(p[0] - prev[0], (p[1] - prev[1]) / aspect) /
            Math.max(1, stroke.size / 6),
        ),
      );
    for (let j = 1; j <= steps; j++) {
      const x = prev[0] + ((p[0] - prev[0]) * j) / steps - left,
        y = prev[1] + ((p[1] - prev[1]) * j) / steps - top;
      paint.save();
      paint.translate(x, y);
      paint.scale(1, aspect);
      const gradient = paint.createRadialGradient(
        0,
        0,
        rx * Math.min(0.999, stroke.hardness),
        0,
        0,
        rx,
      );
      gradient.addColorStop(0, "white");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      paint.fillStyle = gradient;
      paint.fillRect(-rx, -rx, rx * 2, rx * 2);
      paint.restore();
    }
  }
  ctx.save();
  ctx.globalAlpha = stroke.opacity;
  ctx.globalCompositeOperation = stroke.restore
    ? "source-over"
    : "destination-out";
  ctx.drawImage(c, left, top);
  ctx.restore();
}
