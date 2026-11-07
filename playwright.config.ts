// End-to-end dry run in a real browser against the TEST database (.env.test). It is wiped first.
//   npm run test:setup   (once, creates the tables)
//   npm run e2e          (starts the app on :3100 and runs e2e/*.spec.ts in order)
import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

const testDb = readFileSync(".env.test", "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL"))!
  .replace(/^DATABASE_URL=/, "").trim().replace(/^"|"$/g, "");
if (!/test/i.test(testDb)) throw new Error("e2e must use a TEST database (name contains 'test')");
process.env.E2E_DATABASE_URL = testDb;
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1, // the files build on each other: setup -> forms -> insights
  timeout: 90_000,
  expect: { timeout: 15_000 },
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],
  outputDir: "e2e/results",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure", ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_URL: testDb, NEXT_TELEMETRY_DISABLED: "1" },
  },
});
