export type Tool =
  | "select"
  | "pan"
  | "crop"
  | "brush"
  | "erase"
  | "restore"
  | "text"
  | "shape"
  | "zoom";

export type Brush = {
  size: number;
  hardness: number;
  opacity: number;
  feather: number;
  color: string;
};
