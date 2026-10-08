import { dimensions } from "./document";
import { job } from "./codec-client";
export async function encodeExtra(
  c: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  if (type === "image/svg+xml") {
    const data = c.toDataURL("image/png");
    return new Blob(
      [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}" viewBox="0 0 ${c.width} ${c.height}"><image width="${c.width}" height="${c.height}" href="${data}"/></svg>`,
      ],
      { type },
    );
  }
  const image = c.getContext("2d")!.getImageData(0, 0, c.width, c.height),
    data = image.data.buffer;
  const result = await job<{ data: ArrayBuffer }>(
    { kind: "encode", width: c.width, height: c.height, data, type, quality },
    [data],
  );
  return new Blob([result.data], { type });
}
function sanitizedSVG(text: string) {
  const document = new DOMParser().parseFromString(text, "image/svg+xml");
  if (
    document.querySelector("parsererror") ||
    document.documentElement.localName !== "svg"
  )
    throw new Error("Invalid SVG");
  document
    .querySelectorAll("script,foreignObject,iframe,object,embed,style")
    .forEach((n) => n.remove());
  for (const element of document.querySelectorAll("*"))
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase(),
        value = attribute.value;
      if (
        name.startsWith("on") ||
        name === "style" ||
        ((name === "href" || name === "xlink:href") &&
          !value.startsWith("#") &&
          !/^data:image\/(png|jpeg|webp);base64,/.test(value)) ||
        (/url\(/i.test(value) && !/url\(\s*['"]?#/.test(value))
      )
        element.removeAttribute(attribute.name);
    }
  const svg = document.documentElement;
  const viewBox = svg
    .getAttribute("viewBox")
    ?.split(/[\s,]+/)
    .map(Number);
  if (!svg.getAttribute("width") && viewBox)
    svg.setAttribute("width", String(viewBox[2]));
  if (!svg.getAttribute("height") && viewBox)
    svg.setAttribute("height", String(viewBox[3]));
  return new Blob([new XMLSerializer().serializeToString(document)], {
    type: "image/svg+xml",
  });
}
async function browserDecode(blob: Blob) {
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      dimensions(image.naturalWidth, image.naturalHeight);
      return await createImageBitmap(image);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
export async function decodeImport(file: File) {
  let ext = file.name.split(".").at(-1)?.toLowerCase() || "";
  if (file.type === "image/tiff") ext = "tiff";
  if (file.type === "image/svg+xml") ext = "svg";
  if (
    !file.type.startsWith("image/") &&
    ![
      "png",
      "jpg",
      "jpeg",
      "jfif",
      "webp",
      "avif",
      "gif",
      "bmp",
      "tiff",
      "tif",
      "ico",
      "svg",
      "psd",
      "jxl",
      "tga",
      "ppm",
      "qoi",
      "heic",
      "heif",
    ].includes(ext)
  )
    throw new Error("Choose an image. PDF is available as an export format.");
  let blob: Blob = file;
  if (ext === "svg") blob = sanitizedSVG(await file.text());
  if (["tiff", "tif", "psd", "jxl", "tga", "ppm", "qoi"].includes(ext)) {
    const data = await file.arrayBuffer();
    blob = (await job<{ blob: Blob }>({ kind: "decode", data, ext }, [data]))
      .blob;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await browserDecode(blob);
  } catch {
    if (ext === "avif" || ext === "bmp") {
      const data = await file.arrayBuffer();
      blob = (await job<{ blob: Blob }>({ kind: "decode", data, ext }, [data]))
        .blob;
      bitmap = await browserDecode(blob);
    } else
      throw new Error(
        `${file.name || "Image"} could not be decoded locally. HEIC/HEIF and RAW depend on browser support; convert unsupported files to PNG/TIFF.`,
      );
  }
  try {
    dimensions(bitmap.width, bitmap.height);
    const c = document.createElement("canvas");
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext("2d")!.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) =>
      c.toBlob((b) =>
        b ? resolve(b) : reject(new Error("Image import encoding failed")),
      ),
    );
    return { blob: png, width: c.width, height: c.height };
  } finally {
    bitmap.close();
  }
}
