import { dimensions, Artboard } from "./document";
import { renderBoard } from "./render";
import { job } from "./codec-client";
export async function exportPDF(
  boards: Artboard[],
  scale: number,
  custom: { w: number; h: number },
  progress: (s: string) => void,
) {
  const pages: { png: ArrayBuffer; width: number; height: number }[] = [];
  let total = 0;
  for (let i = 0; i < boards.length; i++) {
    const b = boards[i],
      w = custom.w || Math.round(b.width * scale),
      h = custom.h || Math.round(b.height * scale);
    dimensions(w, h);
    total += w * h;
    if (total > 64_000_000)
      throw new Error(
        "This PDF exceeds 64 megapixels across pages. Export fewer pages or reduce scale.",
      );
    progress(`Rendering PDF page ${i + 1} of ${boards.length}`);
    const c = await renderBoard(b, w, h);
    const blob = await new Promise<Blob>((resolve, reject) =>
      c.toBlob((b) =>
        b ? resolve(b) : reject(new Error("PDF page encoding failed")),
      ),
    );
    pages.push({ png: await blob.arrayBuffer(), width: w, height: h });
  }
  progress("Assembling local PDF");
  const result = await job<{ data: ArrayBuffer }>(
    { kind: "pdf", pages },
    pages.map((p) => p.png),
  );
  return new Blob([result.data], { type: "application/pdf" });
}
