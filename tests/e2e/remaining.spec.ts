import {
  test,
  expect,
  chromium,
  firefox,
  webkit,
  Page,
} from "@playwright/test";
import { mkdir } from "node:fs/promises";
async function openFixture(page: Page, name = "coffee") {
  await page.goto("/editor/");
  await expect(
    page.getByRole("button", { name: "Choose an image", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(`tests/fixtures/${name}.png`);
  await page
    .getByRole("button", { name: "Keep original", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `${name}.png`, exact: true }),
  ).toBeVisible();
}
async function alphaSummary(page: Page) {
  return page.getByLabel("Editing canvas").evaluate((node) => {
    const c = node as HTMLCanvasElement,
      d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let clear = 0,
      opaque = 0,
      soft = 0;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] < 20) clear++;
      else if (d[i] > 235) opaque++;
      else soft++;
    }
    return { clear, opaque, soft, total: d.length / 4 };
  });
}
test("general AI on real photographs, detailed local model and portrait mode", async ({
  page,
}) => {
  test.setTimeout(300000);
  await openFixture(page);
  await page
    .getByRole("combobox", { name: "Background model", exact: true })
    .selectOption("general");
  await page
    .getByRole("button", { name: /Remove background Local AI/ })
    .click();
  await expect(page.getByText(/Background removed locally/)).toBeVisible({
    timeout: 120000,
  });
  let a = await alphaSummary(page);
  console.log("Coffee U2Net mask", a);
  expect(a.clear).toBeGreaterThan(a.total * 0.05);
  expect(a.opaque).toBeGreaterThan(a.total * 0.05);
  await mkdir("test-results/ai", { recursive: true });
  await page.screenshot({ path: "test-results/ai/coffee-fast.png" });
  await page
    .getByRole("combobox", { name: "Background model", exact: true })
    .selectOption("detail");
  await page
    .getByRole("button", { name: /Remove background Local AI/ })
    .click();
  await expect(
    page
      .locator(".toast")
      .filter({ hasText: /Background removed locally.*detailed/ }),
  ).toBeVisible({ timeout: 240000 });
  await expect
    .poll(async () => (await alphaSummary(page)).clear)
    .not.toBe(a.clear);
  a = await alphaSummary(page);
  console.log("Coffee BiRefNet mask", a);
  expect(a.clear).toBeGreaterThan(a.total * 0.05);
  expect(a.opaque).toBeGreaterThan(a.total * 0.05);
  await page.screenshot({ path: "test-results/ai/coffee-detail.png" });
  await page.getByRole("button", { name: "Add artboard", exact: true }).click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/astronaut.png");
  await page
    .getByRole("button", { name: "Keep original", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Background model", exact: true })
    .selectOption("portrait");
  await page
    .getByRole("button", { name: /Remove background Local AI/ })
    .click();
  await expect(
    page
      .locator(".toast")
      .filter({ hasText: /Background removed locally.*Portraits/ }),
  ).toBeVisible({ timeout: 120000 });
  await expect
    .poll(async () => (await alphaSummary(page)).clear)
    .toBeGreaterThan(512 * 512 * 0.05);
  a = await alphaSummary(page);
  expect(a.clear).toBeGreaterThan(a.total * 0.05);
  expect(a.opaque).toBeGreaterThan(a.total * 0.05);
  await page.screenshot({ path: "test-results/ai/portrait.png" });
});
test("project gallery, history-safe cleanup, device suggestions and two-tab protection", async ({
  page,
  context,
}) => {
  await openFixture(page);
  await page.getByLabel("Project name").fill("Coffee project");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Device setup", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Device setup" }),
  ).toBeVisible();
  await expect(
    page.getByText(/CPU processing remains|WebGPU adapter/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name").fill("Second project");
  await page.getByRole("button", { name: "Layer", exact: true }).click();
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Open Coffee project", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "coffee.png", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove unused local assets", exact: true })
    .click();
  await expect(
    page.getByText(/Undo and saved projects preserved/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "coffee.png", exact: true }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("/editor/");
  await expect(other.getByText(/Another tab is editing/)).toBeVisible();
  await other.getByLabel("Project name").fill("Must not overwrite");
  await other.close();
  await expect(page.getByLabel("Project name")).toHaveValue("Coffee project");
});
for (const [name, engine] of [
  ["Firefox", firefox],
  ["WebKit", webkit],
] as const)
  test(`${name} import, filters, masks, worker codecs, export and persisted reload`, async () => {
    test.skip(
      name === "Firefox" && process.env.SKIP_FIREFOX_QA === "1",
      "Firefox binary cannot start on this host; see CODEX_HANDOFF.md",
    );
    test.setTimeout(180000);
    const browser = await engine.launch({
      executablePath:
        name === "Firefox" ? process.env.FIREFOX_EXECUTABLE : undefined,
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      permissions: [],
    });
    const page = await context.newPage();
    try {
      await openFixture(page);
      await page
        .getByRole("slider", { name: "brightness", exact: true })
        .fill("15");
      await page.getByText("Advanced adjustments", { exact: true }).click();
      await page.getByRole("slider", { name: "blur", exact: true }).fill("3");
      await page
        .getByRole("combobox", { name: "Curve channel", exact: true })
        .selectOption("redCurve");
      await page
        .getByRole("slider", { name: "Curve point 3", exact: true })
        .fill("140");
      await page
        .getByRole("slider", { name: "HSL Red saturation", exact: true })
        .fill("-20");
      await page
        .getByRole("button", { name: "Erase mask · E", exact: true })
        .click();
      const box = (await page.getByLabel("Editing canvas").boundingBox())!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await expect
        .poll(async () => (await alphaSummary(page)).clear)
        .toBeGreaterThan(0);
      for (const mime of [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/avif",
        "image/jxl",
        "application/pdf",
      ]) {
        await page.getByRole("button", { name: "Export", exact: true }).click();
        await page
          .getByRole("combobox", { name: "Format", exact: true })
          .selectOption(mime);
        const [d] = await Promise.all([
          page.waitForEvent("download"),
          page
            .getByRole("button", { name: "Export this artboard", exact: true })
            .click(),
        ]);
        expect(await d.failure()).toBeNull();
      }
      await page
        .getByRole("button", { name: "Restore mask · R", exact: true })
        .click();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await expect(
        page.getByText("Saved on this device", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("button", { name: "coffee.png", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "coffee.png", exact: true })
        .click();
      await page
        .getByRole("button", { name: /Remove background Local AI/ })
        .click();
      await expect(page.getByText(/Background removed locally/)).toBeVisible({
        timeout: 120000,
      });
      console.log(name, "AI and exports verified");
    } finally {
      await context.close();
      await browser.close();
    }
  });
test("large-image preview stays bounded and full-resolution export remains available", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/editor/");
  await expect(
    page.getByRole("button", { name: "Choose an image", exact: true }),
  ).toBeVisible();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 4096;
    c.height = 3072;
    const x = c.getContext("2d")!;
    x.fillStyle = "#7760d7";
    x.fillRect(0, 0, c.width, c.height);
    return c.toDataURL().split(",")[1];
  });
  const start = Date.now();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.from(data, "base64"),
    });
  await page
    .getByRole("button", { name: "Keep original", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByLabel("Editing canvas")
        .evaluate((node) => (node as HTMLCanvasElement).width),
    )
    .toBe(2048);
  await page
    .getByRole("slider", { name: "brightness", exact: true })
    .fill("10");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  const imported = Date.now() - start;
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const [d] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Export this artboard", exact: true })
      .click(),
  ]);
  const path = await d.path();
  expect(path).toBeTruthy();
  const { readFile } = await import("node:fs/promises"),
    bytes = await readFile(path!);
  expect(bytes.readUInt32BE(16)).toBe(4096);
  expect(bytes.readUInt32BE(20)).toBe(3072);
  console.log(
    `12 MP import/adjust/save ${imported} ms; total including full export ${Date.now() - start} ms`,
  );
});

test("headed Chromium reports actual adapter and AI backend without experimental flags", async () => {
  test.setTimeout(180000);
  const browser = await chromium.launch({ headless: false }),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  try {
    await openFixture(page, "chelsea");
    const adapter = await page.evaluate(async () => {
      const gpu = (
        navigator as Navigator & {
          gpu?: {
            requestAdapter: () => Promise<{
              info?: {
                vendor?: string;
                architecture?: string;
                device?: string;
                description?: string;
              };
            } | null>;
          };
        }
      ).gpu;
      try {
        const info = (await gpu?.requestAdapter())?.info;
        return info
          ? {
              vendor: info.vendor,
              architecture: info.architecture,
              device: info.device,
              description: info.description,
            }
          : null;
      } catch {
        return null;
      }
    });
    console.log("Headed physical adapter evidence", JSON.stringify(adapter));
    await page
      .getByRole("button", { name: /Remove background Local AI/ })
      .click();
    await expect(page.getByText(/Background removed locally/)).toBeVisible({
      timeout: 120000,
    });
    console.log("Headed AI backend", await page.locator(".toast").innerText());
    const a = await alphaSummary(page);
    expect(a.clear).toBeGreaterThan(a.total * 0.05);
    expect(a.opaque).toBeGreaterThan(a.total * 0.05);
    await page.screenshot({ path: "test-results/ai/cat.png" });
  } finally {
    await browser.close();
  }
});

test("tablet editor and device dialog retain keyboard access", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await openFixture(page);
  const setup = page.getByRole("button", { name: "Device setup", exact: true });
  await setup.click();
  const dialog = page.getByRole("dialog", { name: "Device setup" });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[aria-modal="true"]'),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(setup).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const canvasBounds = await page.getByLabel("Editing canvas").boundingBox();
  const workspaceBounds = await page.locator(".workspace").boundingBox();
  expect(canvasBounds!.width).toBeLessThan(workspaceBounds!.width - 40);
  await page.screenshot({ path: "test-results/editor-tablet.png" });
});
