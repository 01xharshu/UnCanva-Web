import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("online navigation bypasses stale cached HTML; an update saves the current project before reload", async ({
  page,
  context,
}) => {
  const source = await readFile("out/sw.js", "utf8");
  let revision = "qa-initial-shell";
  await context.route("**/sw.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: source.replace(
        /const VERSION = "[^"]+";/,
        `const VERSION = "uncanva-shell-${revision}";`,
      ),
    }),
  );
  await page.goto("/editor/");
  await expect(
    page.getByRole("button", { name: "Choose an image", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page
    .getByLabel("Project name", { exact: true })
    .fill("Saved before update");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const key = (await caches.keys()).find((k) =>
      k.startsWith("uncanva-shell-"),
    )!;
    await (
      await caches.open(key)
    ).put(
      "/editor/",
      new Response(
        "<!doctype html><html><body>Old cached editor</body></html>",
        { headers: { "Content-Type": "text/html" } },
      ),
    );
  });
  await page.reload();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Saved before update",
  );
  await expect(
    page.getByText("Old cached editor", { exact: true }),
  ).not.toBeVisible();
  revision = "qa-updated-shell";
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await expect(
    page.getByRole("button", { name: "Save and update", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByLabel("Project name", { exact: true })
    .fill("Latest name survives update");
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Save and update", exact: true }).click(),
  ]);
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Latest name survives update",
  );
  await expect(
    page.getByRole("button", { name: "Save and update", exact: true }),
  ).not.toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Latest name survives update",
  );
  await expect(
    page.getByText("Offline · local workspace", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
