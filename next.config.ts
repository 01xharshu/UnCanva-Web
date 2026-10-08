import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  webpack(config) {
    config.resolve.conditionNames = [
      "onnxruntime-web-use-extern-wasm",
      ...config.resolve.conditionNames,
    ];
    return config;
  },
};
export default config;
