import { test, expect } from "@playwright/test";
test("import, edit, layers, undo, persistence, backup and exports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/editor");
  await expect(page.getByText("A little idea.")).toBeVisible();
  const png = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 240;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#cfd3e0";
      ctx.fillRect(0, 0, 320, 240);
      return c.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByText("Would you like to remove the background?"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep original", exact: true })
    .click();
  await page
    .getByRole("slider", { name: "brightness", exact: true })
    .fill("20");
  await page.getByRole("slider", { name: "contrast", exact: true }).fill("10");
  await page.getByText("Advanced adjustments", { exact: true }).click();
  await page.getByRole("slider", { name: "blur", exact: true }).fill("2");
  await page.getByRole("button", { name: "Layer", exact: true }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByLabel("Layer width", { exact: true }).fill("140");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Add artboard", exact: true }).click();
  await expect(page.getByLabel("Artboard 2 name")).toHaveValue("Artboard 2");
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await page.getByLabel("Artboard width", { exact: true }).fill("64");
  await page.getByLabel("Artboard height", { exact: true }).fill("48");
  await page.getByRole("button", { name: "Layer", exact: true }).click();
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.getByLabel("Layer x", { exact: true }).fill("0");
  await page.getByLabel("Layer y", { exact: true }).fill("0");
  await page.getByLabel("Layer width", { exact: true }).fill("32");
  await page.getByLabel("Layer height", { exact: true }).fill("24");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Artboard 2 name")).toHaveValue("Artboard 2");
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
    expect(d.suggestedFilename()).toMatch(/uncanva-export\.(png|jpg|webp)/);
    expect(await d.failure()).toBeNull();
  }
  await page.getByRole("button", { name: "Copy PNG", exact: true }).click();
  await expect(
    page.getByText("Edited PNG copied with transparency."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  const [backup] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Download project backup", exact: true })
      .click(),
  ]);
  expect(backup.suggestedFilename()).toMatch(/\.uncanva$/);
  await page.screenshot({
    path: "test-results/editor-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("clipboard paste, mask erase/restore, local AI and offline reload", async ({
  page,
  context,
}) => {
  const outbound: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://localhost:3000") &&
      !r.url().startsWith("blob:") &&
      !r.url().startsWith("data:")
    )
      outbound.push(r.url());
  });
  await page.goto("/editor");
  await expect(page.getByText("A little idea.")).toBeVisible();
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#cfd3e0";
    x.fillRect(0, 0, 128, 128);
    x.fillStyle = "#806dce";
    x.fillRect(40, 20, 48, 100);
    const blob = await new Promise<Blob>((resolve) =>
      c.toBlob((b) => resolve(b!)),
    );
    const file = new File([blob], "pasted.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    document.body.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }),
    );
  });
  await expect(
    page.getByText("Would you like to remove the background?"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove background", exact: true })
    .last()
    .click();
  await expect(page.locator(".toast")).toBeVisible({ timeout: 110000 });
  await expect(page.getByText(/Background removed locally/)).toBeVisible({
    timeout: 110000,
  });
  await page
    .getByRole("button", { name: "Erase mask · E", exact: true })
    .click();
  const c = page.getByLabel("Editing canvas"),
    box = (await c.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 10,
    box.y + box.height / 2 + 10,
    { steps: 5 },
  );
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Restore mask · R", exact: true })
    .click();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await page
    .getByRole("button", { name: "Download AI for offline use", exact: true })
    .click();
  await expect(
    page.getByText("AI assets cached for offline use", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Offline · local workspace")).toBeVisible();
  await page.getByRole("button", { name: "pasted.png", exact: true }).click();
  await page.getByRole("button", { name: "Adjust", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "brightness", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Remove background Local AI/ })
    .click();
  await expect(page.locator(".toast")).toBeVisible({ timeout: 110000 });
  await expect(page.getByText(/Background removed locally/)).toBeVisible();
  console.log("Verified AI backend:", await page.locator(".toast").innerText());
  expect(outbound).toEqual([]);
  await page.screenshot({ path: "test-results/editor-offline.png" });
  await context.setOffline(false);
});
