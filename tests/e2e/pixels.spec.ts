import { test, expect, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function pixel(page: Page, x: number, y: number) {
  return page
    .getByLabel("Editing canvas")
    .evaluate(
      (node, { x, y }) =>
        Array.from(
          (node as HTMLCanvasElement).getContext("2d")!.getImageData(x, y, 1, 1)
            .data,
        ),
      { x, y },
    );
}
async function importFixture(page: Page) {
  await page.goto("/editor");
  await expect(
    page.getByRole("button", { name: "Choose an image", exact: true }),
  ).toBeVisible();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 160;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#dc5340";
    ctx.fillRect(20, 20, 200, 120);
    return c.toDataURL().split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "alpha-fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(data, "base64"),
    });
  await page
    .getByRole("button", { name: "Keep original", exact: true })
    .click();
  await expect.poll(() => pixel(page, 120, 80)).toEqual([220, 83, 64, 255]);
}
test("mask pixels, zoom/DPR coordinates, undo, clipboard, export alpha and backup round trip", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const outbound: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://localhost:3000") &&
      !r.url().startsWith("blob:") &&
      !r.url().startsWith("data:")
    )
      outbound.push(r.url());
  });
  await importFixture(page);
  await page.getByLabel("Zoom percentage").fill("150");
  await page
    .getByRole("button", { name: "Erase mask · E", exact: true })
    .click();
  const box = (await page.getByLabel("Editing canvas").boundingBox())!;
  await page.mouse.click(box.x + 120 * 1.5, box.y + 80 * 1.5);
  await expect.poll(async () => (await pixel(page, 120, 80))[3]).toBe(0);
  await page
    .getByRole("button", { name: "Restore mask · R", exact: true })
    .click();
  await page.mouse.click(box.x + 120 * 1.5, box.y + 80 * 1.5);
  await expect.poll(() => pixel(page, 120, 80)).toEqual([220, 83, 64, 255]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(async () => (await pixel(page, 120, 80))[3]).toBe(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect.poll(() => pixel(page, 120, 80)).toEqual([220, 83, 64, 255]);
  await page.getByRole("button", { name: "Copy PNG", exact: true }).click();
  await expect(
    page.getByText("Edited PNG copied with transparency."),
  ).toBeVisible();
  const copied = await page.evaluate(async () => {
    const items = await navigator.clipboard.read(),
      blob = await items[0].getType("image/png"),
      bitmap = await createImageBitmap(blob),
      c = document.createElement("canvas");
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext("2d")!.drawImage(bitmap, 0, 0);
    return {
      w: c.width,
      h: c.height,
      center: Array.from(c.getContext("2d")!.getImageData(120, 80, 1, 1).data),
      edge: Array.from(c.getContext("2d")!.getImageData(0, 0, 1, 1).data),
    };
  });
  expect(copied).toEqual({
    w: 240,
    h: 160,
    center: [220, 83, 64, 255],
    edge: [0, 0, 0, 0],
  });
  for (const format of ["image/png", "image/jpeg", "image/webp"]) {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Format", exact: true })
      .selectOption(format);
    const [d] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("button", { name: "Export this artboard", exact: true })
        .click(),
    ]);
    const bytes = await readFile((await d.path())!);
    const result = await page.evaluate(
      async ({ bytes, type }) => {
        const b = await createImageBitmap(
          new Blob([new Uint8Array(bytes)], { type }),
        );
        const c = document.createElement("canvas");
        c.width = b.width;
        c.height = b.height;
        c.getContext("2d")!.drawImage(b, 0, 0);
        return {
          w: b.width,
          h: b.height,
          alpha: c.getContext("2d")!.getImageData(0, 0, 1, 1).data[3],
        };
      },
      { bytes: [...bytes], type: format },
    );
    expect(result).toEqual({
      w: 240,
      h: 160,
      alpha: format === "image/jpeg" ? 255 : 0,
    });
  }
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  const [d] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Download project backup", exact: true })
      .click(),
  ]);
  const file = await d.path();
  const saved = JSON.parse(await readFile(file!, "utf8"));
  expect(saved.project.artboards[0].layers[0].strokes).toHaveLength(2);
  await page.getByRole("button", { name: "Add artboard", exact: true }).click();
  await page.locator("input[type=file]").nth(1).setInputFiles(file!);
  await expect(page.getByLabel("Artboard 2 name")).toHaveCount(0);
  await expect.poll(() => pixel(page, 120, 80)).toEqual([220, 83, 64, 255]);
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect.poll(() => pixel(page, 120, 80)).toEqual([220, 83, 64, 255]);
  expect(outbound).toEqual([]);
  await context.close();
});
test("all corner resize handles, layer move, rotation, crop and paint are editable", async ({
  page,
}) => {
  await importFixture(page);
  await page.getByRole("button", { name: "Layer", exact: true }).click();
  await page.getByRole("button", { name: "Select · V", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resize selected layer", exact: true }),
  ).toHaveCount(4);
  const box = (await page.getByLabel("Editing canvas").boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 70);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 80, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("Layer x", { exact: true })).not.toHaveValue(
    "0",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Layer x", { exact: true })).toHaveValue("0");
  await page.getByLabel("Layer rotation", { exact: true }).fill("45");
  await expect(page.getByLabel("Layer rotation", { exact: true })).toHaveValue(
    "45",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Paint · B", exact: true }).click();
  await page.mouse.move(box.x + 60, box.y + 40);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(box.x + 90, box.y + 60, { steps: 10 });
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Paint stroke", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Paint stroke", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Crop artboard · C", exact: true })
    .click();
  const r = (await page.getByLabel("Editing canvas").boundingBox())!;
  await page.mouse.move(r.x + 20, r.y + 20);
  await page.mouse.down();
  await page.mouse.move(r.x + 100, r.y + 80, { steps: 5 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await expect(
    page.getByLabel("Artboard width", { exact: true }),
  ).not.toHaveValue("240");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Artboard width", { exact: true })).toHaveValue(
    "240",
  );
});

test("real browser clipboard paste imports image pixels", async ({ page }) => {
  await page.goto("/editor");
  await expect(
    page.getByRole("button", { name: "Choose an image", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 80;
    c.height = 60;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#2c6488";
    ctx.fillRect(0, 0, 80, 60);
    const blob = await new Promise<Blob>((resolve) =>
      c.toBlob((b) => resolve(b!)),
    );
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  });
  await page.getByRole("button", { name: "Select · V", exact: true }).click();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+V" : "Control+V",
  );
  await expect(
    page.getByRole("button", { name: "Keep original", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep original", exact: true })
    .click();
  await expect.poll(() => pixel(page, 40, 30)).toEqual([44, 100, 136, 255]);
});
