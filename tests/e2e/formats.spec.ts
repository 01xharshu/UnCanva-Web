import { test, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { formats } from "../../src/lib/formats";
test("all advertised image exporters create real files that import again, plus multipage PDF", async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  await page.goto("/editor/");
  await expect(
    page.getByRole("button", { name: "Choose an image", exact: true }),
  ).toBeVisible();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 80;
    const x = c.getContext("2d")!,
      g = x.createLinearGradient(0, 0, 120, 80);
    g.addColorStop(0, "#d9bd48");
    g.addColorStop(0.5, "#7760d7");
    g.addColorStop(1, "#40a58c");
    x.fillStyle = g;
    x.fillRect(0, 0, 120, 80);
    x.clearRect(0, 0, 20, 20);
    return c.toDataURL().split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "format-fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(data, "base64"),
    });
  await page
    .getByRole("button", { name: "Keep original", exact: true })
    .click();
  await mkdir("test-results/formats", { recursive: true });
  for (const format of formats.filter((f) => f.ext !== "pdf")) {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Format", exact: true })
      .selectOption(format.mime);
    const [d] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("button", { name: "Export this artboard", exact: true })
        .click(),
    ]);
    expect(d.suggestedFilename()).toBe(`uncanva-export.${format.ext}`);
    const path = `test-results/formats/sample.${format.ext}`;
    await d.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.length).toBeGreaterThan(30);
    if (format.ext === "png")
      expect([...bytes.subarray(0, 4)]).toEqual([137, 80, 78, 71]);
    if (format.ext === "psd")
      expect(bytes.toString("ascii", 0, 4)).toBe("8BPS");
    if (format.ext === "jxl")
      expect([...bytes.subarray(0, 2)]).toEqual([255, 10]);
    if (format.ext === "avif")
      expect(bytes.toString("ascii", 4, 8)).toBe("ftyp");
    if (format.ext === "tiff")
      expect(bytes.toString("ascii", 0, 2)).toMatch(/II|MM/);
    if (format.ext === "gif") expect(bytes.toString("ascii", 0, 3)).toBe("GIF");
    // Reimport into a fresh artboard; the original dimensions prove decoding, not just file naming.
    await page
      .getByRole("button", { name: "Add artboard", exact: true })
      .click();
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles({
        name: `roundtrip.${format.ext}`,
        mimeType: format.mime,
        buffer: bytes,
      });
    await expect(
      page.getByRole("button", { name: "Keep original", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await page
      .getByRole("button", { name: "Keep original", exact: true })
      .click();
    if (!["jpg", "bmp", "ppm"].includes(format.ext)) {
      await expect
        .poll(() =>
          page
            .getByLabel("Editing canvas")
            .evaluate(
              (node) =>
                (node as HTMLCanvasElement)
                  .getContext("2d")!
                  .getImageData(5, 5, 1, 1).data[3],
            ),
        )
        .toBe(0);
    }
    await page.getByRole("button", { name: "Canvas", exact: true }).click();
    await expect(
      page.getByLabel("Artboard width", { exact: true }),
    ).toHaveValue("120");
    await expect(
      page.getByLabel("Artboard height", { exact: true }),
    ).toHaveValue(format.ext === "ico" ? "120" : "80");
    await page
      .getByRole("button", { name: "Delete artboard", exact: true })
      .click();
    console.log(`Verified ${format.label}: ${bytes.length} bytes`);
  }
  for (const mime of ["image/jpeg", "image/webp", "image/avif", "image/jxl"]) {
    const lengths = [];
    for (const quality of ["0.2", "0.95"]) {
      await page.getByRole("button", { name: "Export", exact: true }).click();
      await page
        .getByRole("combobox", { name: "Format", exact: true })
        .selectOption(mime);
      await page
        .getByRole("slider", { name: "Export quality", exact: true })
        .fill(quality);
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page
          .getByRole("button", { name: "Export this artboard", exact: true })
          .click(),
      ]);
      lengths.push((await readFile((await download.path())!)).length);
    }
    expect(lengths[1]).toBeGreaterThan(lengths[0]);
    console.log(`Quality affects ${mime}: ${lengths.join(" → ")} bytes`);
  }
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Offline · local workspace")).toBeVisible();
  await page.getByRole("button", { name: "Add artboard", exact: true }).click();
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await page.getByLabel("Artboard width", { exact: true }).fill("80");
  await page.getByLabel("Artboard height", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Layer", exact: true }).click();
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.getByLabel("Layer x", { exact: true }).fill("10");
  await page.getByLabel("Layer y", { exact: true }).fill("10");
  await page.getByLabel("Layer width", { exact: true }).fill("60");
  await page.getByLabel("Layer height", { exact: true }).fill("80");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Format", exact: true })
    .selectOption("application/pdf");
  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Export 2-page PDF", exact: true })
      .click(),
  ]);
  await pdf.saveAs("output/pdf/format-sample.pdf");
  const bytes = await readFile("output/pdf/format-sample.pdf");
  expect(bytes.toString("ascii", 0, 5)).toBe("%PDF-");
  expect(bytes.toString("latin1")).toMatch(/\/Count 2\b/);
  for (const mime of ["image/avif", "image/jxl"]) {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Format", exact: true })
      .selectOption(mime);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("button", { name: "Export this artboard", exact: true })
        .click(),
    ]);
    expect((await readFile((await download.path())!)).length).toBeGreaterThan(
      30,
    );
  }
  await context.setOffline(false);
});
