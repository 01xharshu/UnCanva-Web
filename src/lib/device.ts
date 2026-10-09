export type DeviceInfo = {
  gpu: boolean;
  workers: boolean;
  persistent: boolean;
  usage: number;
  quota: number;
  lowMemory: boolean;
};
export async function deviceInfo(): Promise<DeviceInfo> {
  const gpu = (
    navigator as Navigator & {
      gpu?: { requestAdapter: () => Promise<unknown> };
    }
  ).gpu;
  let available = false;
  try {
    available = !!(await gpu?.requestAdapter());
  } catch {
    /* GPU is optional. */
  }
  const estimate = await navigator.storage
    ?.estimate()
    .catch(() => ({ usage: 0, quota: 0 }));
  const persistent =
    (await navigator.storage?.persisted?.().catch(() => false)) || false;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  return {
    gpu: available,
    workers:
      typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined",
    persistent,
    usage: estimate?.usage || 0,
    quota: estimate?.quota || 0,
    lowMemory: !!memory && memory <= 4,
  };
}
export function previewSize(width: number, height: number, edge = 2048) {
  const factor = Math.min(1, edge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  };
}
