/** A normalized rectangle in original image coordinates; independent of zoom/DPR. */
export type SubjectRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export function subjectRegion(
  a: [number, number],
  b: [number, number],
  width: number,
  height: number,
): SubjectRegion {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const x = clamp(Math.min(a[0], b[0]) / width),
    y = clamp(Math.min(a[1], b[1]) / height);
  return {
    x,
    y,
    width: clamp(Math.max(a[0], b[0]) / width) - x,
    height: clamp(Math.max(a[1], b[1]) / height) - y,
  };
}
export function regionPixels(
  region: SubjectRegion | undefined,
  width: number,
  height: number,
) {
  const r = region || { x: 0, y: 0, width: 1, height: 1 };
  if (
    ![r.x, r.y, r.width, r.height].every(Number.isFinite) ||
    r.width <= 0 ||
    r.height <= 0
  )
    throw new Error("Invalid subject area");
  const x = Math.max(0, Math.min(width - 1, Math.floor(r.x * width)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(r.y * height)));
  return {
    x,
    y,
    width: Math.max(1, Math.min(width - x, Math.ceil(r.width * width))),
    height: Math.max(1, Math.min(height - y, Math.ceil(r.height * height))),
  };
}
