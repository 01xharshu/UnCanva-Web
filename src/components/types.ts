export type Tool =
  | "select"
  | "pan"
  | "crop"
  | "subject"
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
