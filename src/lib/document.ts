import { HSLBand } from "./hsl";
export type Adjustments = Record<
  | "brightness"
  | "contrast"
  | "saturation"
  | "exposure"
  | "temperature"
  | "tint"
  | "highlights"
  | "shadows"
  | "whites"
  | "blacks"
  | "grayscale"
  | "gamma"
  | "vibrance"
  | "sharpness"
  | "blur"
  | "vignette"
  | "red"
  | "green"
  | "blue"
  | "hue",
  number
> & {
  curve: number[];
  redCurve: number[];
  greenCurve: number[];
  blueCurve: number[];
  hsl: HSLBand[];
};
export const defaults: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  grayscale: 0,
  gamma: 1,
  vibrance: 0,
  sharpness: 0,
  blur: 0,
  vignette: 0,
  red: 0,
  green: 0,
  blue: 0,
  hue: 0,
  curve: [0, 64, 128, 192, 255],
  redCurve: [0, 64, 128, 192, 255],
  greenCurve: [0, 64, 128, 192, 255],
  blueCurve: [0, 64, 128, 192, 255],
  hsl: Array.from({ length: 6 }, () => ({
    hue: 0,
    saturation: 0,
    lightness: 0,
  })),
};
export type Stroke = {
  points: [number, number][];
  size: number;
  hardness: number;
  opacity: number;
  restore: boolean;
  aspect?: number;
};
export type Layer = {
  id: string;
  name: string;
  type: "image" | "text" | "rect" | "ellipse";
  asset?: string;
  mask?: string;
  strokes: Stroke[];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  text: string;
  color: string;
  fontSize: number;
  adjustments: Adjustments;
};
export type Artboard = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  layers: Layer[];
};
export type Project = {
  version: 1;
  id: string;
  name: string;
  active: string;
  artboards: Artboard[];
};
export const uid = () => crypto.randomUUID();
export const newBoard = (): Artboard => ({
  id: uid(),
  name: "Untitled artboard",
  width: 1200,
  height: 900,
  background: "transparent",
  layers: [],
});
export function newProject(): Project {
  const b = newBoard();
  return {
    version: 1,
    id: uid(),
    name: "Untitled project",
    active: b.id,
    artboards: [b],
  };
}
export function newLayer(type: Layer["type"]): Layer {
  return {
    id: uid(),
    name:
      type === "text"
        ? "Your words here"
        : type === "image"
          ? "Image"
          : type === "rect"
            ? "Rectangle"
            : "Ellipse",
    type,
    strokes: [],
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    text: "Your words here",
    color: "#8570ee",
    fontSize: 64,
    adjustments: structuredClone(defaults),
  };
}
export class History<T> {
  past: T[] = [];
  future: T[] = [];
  constructor(
    public present: T,
    private limit = 60,
  ) {}
  commit(next: T) {
    if (next === this.present) return;
    this.past.push(this.present);
    if (this.past.length > this.limit) this.past.shift();
    this.present = next;
    this.future = [];
  }
  undo() {
    const p = this.past.pop();
    if (p !== undefined) {
      this.future.push(this.present);
      this.present = p;
    }
    return this.present;
  }
  redo() {
    const p = this.future.pop();
    if (p !== undefined) {
      this.past.push(this.present);
      this.present = p;
    }
    return this.present;
  }
}
export function localPoint(l: Layer, x: number, y: number): [number, number] {
  const r = (-l.rotation * Math.PI) / 180,
    dx = x - l.x - l.width / 2,
    dy = y - l.y - l.height / 2;
  return [
    Math.cos(r) * dx - Math.sin(r) * dy + l.width / 2,
    Math.sin(r) * dx + Math.cos(r) * dy + l.height / 2,
  ];
}
export function dimensions(w: number, h: number) {
  if (
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w < 1 ||
    h < 1 ||
    w > 8192 ||
    h > 8192 ||
    w * h > 32_000_000
  )
    throw new Error("Use dimensions from 1–8192 px, up to 32 megapixels.");
  return [Math.round(w), Math.round(h)];
}
export function validateProject(value: unknown): Project {
  const p = value as Project;
  const text = (s: unknown, max = 256): s is string =>
    typeof s === "string" && s.length <= max;
  const number = (v: unknown, min = -1e7, max = 1e7): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  if (
    !p ||
    p.version !== 1 ||
    !text(p.id) ||
    !text(p.name) ||
    !Array.isArray(p.artboards) ||
    !p.artboards.length ||
    p.artboards.length > 100
  )
    throw new Error("Invalid UnCanva project");
  const boardIds = new Set<string>();
  const layerIds = new Set<string>();
  for (const b of p.artboards) {
    if (
      !b ||
      !text(b.id) ||
      boardIds.has(b.id) ||
      !text(b.name) ||
      !(b.background === "transparent" || /^#[0-9a-f]{6}$/i.test(b.background))
    )
      throw new Error("Invalid artboard");
    boardIds.add(b.id);
    dimensions(b.width, b.height);
    if (!Array.isArray(b.layers) || b.layers.length > 500)
      throw new Error("Invalid layers");
    for (const l of b.layers) {
      if (
        !l ||
        !text(l.id) ||
        layerIds.has(l.id) ||
        !text(l.name) ||
        !["image", "text", "rect", "ellipse"].includes(l.type) ||
        !Array.isArray(l.strokes) ||
        l.strokes.length > 20000 ||
        !l.adjustments ||
        ![l.x, l.y, l.width, l.height, l.rotation].every((v) => number(v)) ||
        !number(l.opacity, 0, 1) ||
        l.width <= 0 ||
        l.height <= 0 ||
        typeof l.visible !== "boolean" ||
        typeof l.locked !== "boolean" ||
        !text(l.text, 100000) ||
        !/^#[0-9a-f]{6}$/i.test(l.color) ||
        !number(l.fontSize, 1, 10000) ||
        (l.type === "image" && !text(l.asset, 100)) ||
        (l.mask !== undefined && !text(l.mask, 100))
      )
        throw new Error("Invalid layer");
      layerIds.add(l.id);
      // Version-1 projects predate per-channel curves and HSL; migrate only absent fields.
      for (const key of ["redCurve", "greenCurve", "blueCurve", "hsl"] as const)
        if (l.adjustments[key] === undefined)
          Object.assign(l.adjustments, {
            [key]: structuredClone(defaults[key]),
          });
      for (const [key, defaultValue] of Object.entries(defaults)) {
        const v = l.adjustments[key as keyof Adjustments];
        if (key === "hsl") {
          if (
            !Array.isArray(v) ||
            v.length !== 6 ||
            !v.every(
              (b) =>
                typeof b === "object" &&
                b &&
                "hue" in b &&
                "saturation" in b &&
                "lightness" in b &&
                number(b.hue, -180, 180) &&
                number(b.saturation, -100, 100) &&
                number(b.lightness, -100, 100),
            )
          )
            throw new Error("Invalid HSL bands");
        } else if (Array.isArray(defaultValue)) {
          if (
            !Array.isArray(v) ||
            v.length !== 5 ||
            !v.every((n) => number(n, 0, 255))
          )
            throw new Error("Invalid tone curve");
        } else if (
          !number(v, -180, 180) ||
          (key === "gamma" && !number(v, 0.1, 3))
        )
          throw new Error("Invalid adjustment");
      }
      for (const stroke of l.strokes) {
        if (
          !stroke ||
          !Array.isArray(stroke.points) ||
          stroke.points.length > 100000 ||
          !number(stroke.size, 0.01, 100000) ||
          !number(stroke.hardness, 0, 1) ||
          !number(stroke.opacity, 0, 1) ||
          typeof stroke.restore !== "boolean" ||
          (stroke.aspect !== undefined &&
            !number(stroke.aspect, 0.0001, 10000)) ||
          !stroke.points.every(
            (point) =>
              Array.isArray(point) &&
              point.length === 2 &&
              point.every((v) => number(v)),
          )
        )
          throw new Error("Invalid brush stroke");
      }
    }
  }
  if (!p.artboards.some((b) => b.id === p.active)) p.active = p.artboards[0].id;
  return p;
}

/** Resize around the opposite fixed corner, including rotated layers. */
export function resizeLayer(
  layer: Layer,
  point: [number, number],
  corner: "tl" | "tr" | "bl" | "br",
  proportional = false,
): Partial<Layer> {
  const sx = corner.endsWith("r") ? 1 : -1,
    sy = corner.startsWith("b") ? 1 : -1,
    r = (layer.rotation * Math.PI) / 180,
    co = Math.cos(r),
    si = Math.sin(r);
  const ax =
      layer.x +
      layer.width / 2 -
      (co * sx * layer.width) / 2 +
      (si * sy * layer.height) / 2,
    ay =
      layer.y +
      layer.height / 2 -
      (si * sx * layer.width) / 2 -
      (co * sy * layer.height) / 2;
  const dx = point[0] - ax,
    dy = point[1] - ay;
  const width = Math.max(5, sx * (co * dx + si * dy));
  let height = Math.max(5, sy * (-si * dx + co * dy));
  if (proportional) height = (width * layer.height) / layer.width;
  return {
    width,
    height,
    x: ax + (co * sx * width) / 2 - (si * sy * height) / 2 - width / 2,
    y: ay + (si * sx * width) / 2 + (co * sy * height) / 2 - height / 2,
  };
}
