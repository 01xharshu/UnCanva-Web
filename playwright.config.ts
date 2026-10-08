import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: "npm run serve",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
