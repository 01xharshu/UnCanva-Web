export function matteValues(
  values: ArrayLike<number | bigint>,
  kind: "alpha" | "normalized" | "logits",
) {
  let min = Infinity,
    max = -Infinity;
  if (kind === "normalized")
    for (let i = 0; i < values.length; i++) {
      const n = Number(values[i]);
      min = Math.min(min, n);
      max = Math.max(max, n);
    }
  const result = new Uint8ClampedArray(values.length);
  for (let i = 0; i < values.length; i++) {
    const value = Number(values[i]);
    if (!Number.isFinite(value))
      throw new Error(
        "The model returned an invalid mask. Previous mask preserved.",
      );
    const alpha =
      kind === "logits"
        ? 1 / (1 + Math.exp(-value))
        : kind === "normalized" && max - min > 1e-8
          ? (value - min) / (max - min)
          : value;
    result[i] = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  }
  return result;
}

/** Reject unusable masks rather than replacing a good existing edit with empty/solid output. */
export function assertUsefulMatte(alpha: Uint8ClampedArray) {
  let clear = 0,
    foreground = 0;
  for (const a of alpha) {
    if (a < 32) clear++;
    if (a > 224) foreground++;
  }
  if (
    !alpha.length ||
    clear / alpha.length > 0.999 ||
    foreground / alpha.length > 0.999
  )
    throw new Error(
      "The model did not find a usable foreground/background separation. Your previous mask is preserved. Select an image area or try another model.",
    );
}
