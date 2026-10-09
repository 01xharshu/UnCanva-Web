export type ModelId = "general" | "portrait" | "detail";
export const models = {
  general: {
    label: "General subjects · fast",
    file: "/models/u2netp.onnx",
    size: 320,
    bytes: 4574861,
    normalization: "imagenet",
    output: "normalized",
    description:
      "People, products, animals and salient objects. Fast, with modest edge detail.",
  },
  portrait: {
    label: "Portraits · fine hair",
    file: "/models/modnet.onnx",
    size: 512,
    bytes: 25888640,
    normalization: "modnet",
    output: "alpha",
    description:
      "Portrait matting for people. Keep erase and restore available for difficult edges.",
  },
  detail: {
    label: "General subjects · detailed",
    file: "/models/birefnet.onnx",
    size: 512,
    bytes: 191877254,
    normalization: "imagenet",
    output: "logits",
    description:
      "BiRefNet Lite, 183 MB model. More memory and processing time; results still need review.",
  },
} as const;
export const modelIds = Object.keys(models) as ModelId[];
export const AI_CACHE = "uncanva-ai-v2";

export function modelURLs(id: ModelId) {
  return id === "detail"
    ? Array.from({ length: 8 }, (_, i) => `/models/birefnet/part-${i}.bin`)
    : [models[id].file];
}
