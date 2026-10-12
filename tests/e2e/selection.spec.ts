import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function pixel(
  page: import("@playwright/test").Page,
  x: number,
  y: number,
) {
  return page.getByLabel("Editing canvas").evaluate(
    (c, pos) => {
      const canvas = c as HTMLCanvasElement;
      return [
        ...canvas
          .getContext("2d")!
          .getImageData(
            Math.floor(pos[0] * canvas.width),
            Math.floor(pos[1] * canvas.height),
            1,
            1,
          ).data,
      ];
    },
    [x, y],
  );
}
async function select(
  page: import("@playwright/test").Page,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  await page
    .getByRole("button", { name: "Select image area", exact: true })
    .click();
  const box = (await page.getByLabel("Editing canvas").boundingBox())!;
  await page.mouse.move(box.x + x * box.width, box.y + y * box.height);
  await page.mouse.down();
  await page.mouse.move(
    box.x + (x + w) * box.width,
    box.y + (y + h) * box.height,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("Selected subject area")).toBeVisible();
}
test("selection erases/restores/keeps pixels with undo, export and reload; focused AI excludes graphic frames", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/editor/");
  await expect(
    page.getByRole("button", { name: "Choose an image", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Background model", exact: true }),
  ).toHaveValue("detail");
  const photo = (await readFile("tests/fixtures/coffee.png")).toString(
    "base64",
  );
  const composite = await page.evaluate(async (base64) => {
    const image = await createImageBitmap(
      new Blob([Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))], {
        type: "image/png",
      }),
    );
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 650;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#eeeeef";
    ctx.fillRect(0, 0, 900, 650);
    ctx.fillStyle = "#282033";
    ctx.font = "42px sans-serif";
    ctx.fillText("A surrounding graphic", 100, 65);
    ctx.drawImage(image, 150, 125);
    image.close();
    return c.toDataURL().split(",")[1];
  }, photo);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "composite.png",
      mimeType: "image/png",
      buffer: Buffer.from(composite, "base64"),
    });
  await page
    .getByRole("button", { name: "Keep original", exact: true })
    .click();
  await expect.poll(async () => (await pixel(page, 0.05, 0.05))[3]).toBe(255);
  await expect.poll(async () => (await pixel(page, 0.35, 0.4))[3]).toBe(255);
  await select(page, 0.25, 0.3, 0.25, 0.25);
  await page.keyboard.press("Delete");
  await expect.poll(async () => (await pixel(page, 0.35, 0.4))[3]).toBe(0);
  expect((await pixel(page, 0.05, 0.05))[3]).toBe(255);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(async () => (await pixel(page, 0.35, 0.4))[3]).toBe(255);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect.poll(async () => (await pixel(page, 0.35, 0.4))[3]).toBe(0);
  await page
    .getByRole("button", { name: "Restore selected area", exact: true })
    .click();
  await expect.poll(async () => (await pixel(page, 0.35, 0.4))[3]).toBe(255);
  await page
    .getByRole("button", { name: "Keep only selected area", exact: true })
    .click();
  await expect.poll(async () => (await pixel(page, 0.05, 0.05))[3]).toBe(0);
  expect((await pixel(page, 0.35, 0.4))[3]).toBe(255);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Selected subject area")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Area selection · A", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Area selection · A", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await select(page, 150 / 900, 125 / 650, 600 / 900, 400 / 650);
  await page
    .getByRole("button", { name: /Remove background Local AI/ })
    .click();
  await expect(
    page
      .locator(".toast")
      .filter({ hasText: /Background removed locally.*detailed/ }),
  ).toBeVisible({ timeout: 120000 });
  await expect.poll(async () => (await pixel(page, 0.05, 0.05))[3]).toBe(0);
  expect((await pixel(page, 0.5, 0.5))[3]).toBeGreaterThan(240);
  await page
    .getByRole("button", { name: "Use whole image", exact: true })
    .click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Export this artboard", exact: true })
      .click(),
  ]);
  const bytes = await readFile((await download.path())!);
  const dimensions = await page.evaluate(async (base64) => {
    const b = await createImageBitmap(
      new Blob([Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))], {
        type: "image/png",
      }),
    );
    const c = document.createElement("canvas");
    c.width = b.width;
    c.height = b.height;
    const x = c.getContext("2d")!;
    x.drawImage(b, 0, 0);
    b.close();
    return {
      width: c.width,
      height: c.height,
      corner: x.getImageData(10, 10, 1, 1).data[3],
    };
  }, bytes.toString("base64"));
  expect(dimensions).toEqual({ width: 900, height: 650, corner: 0 });
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "composite.png", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await pixel(page, 0.5, 0.5))[3])
    .toBeGreaterThan(240);
  await expect.poll(async () => (await pixel(page, 0.05, 0.05))[3]).toBe(0);
  await page
    .getByRole("button", { name: "composite.png", exact: true })
    .click();
  await select(page, 150 / 900, 125 / 650, 600 / 900, 400 / 650);
  await page.screenshot({ path: "test-results/focused-ai-selection.png" });
});

test("area removal follows rotated/resized image coordinates at DPR 2 and preserves original transparency", async ({
  browser,
}) => {
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  try {
    await page.goto("http://localhost:3000/editor/");
    await expect(
      page.getByRole("button", { name: "Choose an image", exact: true }),
    ).toBeVisible();
    const data = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 120;
      c.height = 80;
      const x = c.getContext("2d")!;
      x.fillStyle = "#e23a19";
      x.fillRect(10, 10, 100, 60);
      x.clearRect(50, 35, 10, 10);
      return c.toDataURL().split(",")[1];
    });
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles({
        name: "transparent.png",
        mimeType: "image/png",
        buffer: Buffer.from(data, "base64"),
      });
    await page
      .getByRole("button", { name: "Keep original", exact: true })
      .click();
    await page.getByRole("button", { name: "Canvas", exact: true }).click();
    await page.getByLabel("Artboard width", { exact: true }).fill("320");
    await page.getByLabel("Artboard height", { exact: true }).fill("260");
    await page.getByRole("button", { name: "Layer", exact: true }).click();
    for (const [name, value] of Object.entries({
      x: 60,
      y: 70,
      width: 200,
      height: 120,
      rotation: 37,
    }))
      await page
        .getByLabel(`Layer ${name}`, { exact: true })
        .fill(String(value));
    await page.getByLabel("Zoom percentage", { exact: true }).fill("100");
    await page
      .getByRole("button", { name: "Area selection · A", exact: true })
      .click();
    const box = (await page.getByLabel("Editing canvas").boundingBox())!;
    const point = (u: number, v: number): [number, number] => {
      const rad = (37 * Math.PI) / 180,
        dx = (u - 0.5) * 200,
        dy = (v - 0.5) * 120;
      return [
        box.x + 160 + dx * Math.cos(rad) - dy * Math.sin(rad),
        box.y + 130 + dx * Math.sin(rad) + dy * Math.cos(rad),
      ];
    };
    const a = point(0.15, 0.2),
      b = point(0.75, 0.7),
      solid = point(0.25, 0.35),
      hole = point(55 / 120, 40 / 80),
      untouched = point(0.85, 0.5);
    const at = async (p: [number, number]) =>
      pixel(page, (p[0] - box.x) / 320, (p[1] - box.y) / 260);
    await expect.poll(async () => (await at(solid))[3]).toBe(255);
    expect((await at(hole))[3]).toBe(0);
    await page.mouse.move(...a);
    await page.mouse.down();
    await page.mouse.move(...b, { steps: 5 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Adjust", exact: true }).click();
    await page
      .getByRole("button", { name: "Erase selected area", exact: true })
      .click();
    await expect.poll(async () => (await at(solid))[3]).toBe(0);
    expect((await at(untouched))[3]).toBe(255);
    await page
      .getByRole("button", { name: "Restore selected area", exact: true })
      .click();
    await expect.poll(async () => (await at(solid))[3]).toBe(255);
    expect((await at(hole))[3]).toBe(0);
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Selected subject area")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "transparent.png", exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
