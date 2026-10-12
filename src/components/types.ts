export type Tool =
  | "select"
  | "pan"
  | "crop"
  | "subject"
  | "lasso"
  | "wand"
  | "brush"
  | "erase"
  | "restore"
  | "text"
  | "shape"
  | "path"
  | "zoom";

export type Brush = {
  size: number;
  hardness: number;
  opacity: number;
  feather: number;
  color: string;
};
