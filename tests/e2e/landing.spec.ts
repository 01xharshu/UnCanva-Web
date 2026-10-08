import { test, expect } from "@playwright/test";
test("landing is responsive and every studio CTA opens the real editor", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your ideas.",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("link", { name: "Make something yours" }),
    ).toHaveAttribute("href", /^\/editor\/?$/);
    await page.screenshot({
      path: `test-results/landing-${name}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("link", { name: "Open the studio" }).click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(
    page.getByRole("button", { name: "Import image", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
