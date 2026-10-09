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
  await select(page, 0.25, 0.3, 0.25, 0.25);
  await page
    .getByRole("button", { name: "Erase selected area", exact: true })
    .click();
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
  await expect.poll(async () => (await pixel(page, 0.05, 0.05))[3]).toBe(0);
  await page.screenshot({ path: "test-results/focused-ai-selection.png" });
});
