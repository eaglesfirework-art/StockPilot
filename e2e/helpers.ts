import { expect, type Page } from "@playwright/test";

export const ADMIN = { name: "Asha Admin", email: "admin@stockpilot.test", password: "Admin@12345" };
export const RAVI = { name: "Ravi Kumar", email: "ravi@stockpilot.test", password: "Ravi@12345" };
export const SURESH = { name: "Suresh Patil", email: "suresh@stockpilot.test", password: "Suresh@12345" };

export const EVIDENCE = "docs/evidence";
export const shot = (page: Page, name: string) => page.screenshot({ path: `${EVIDENCE}/${name}.png`, fullPage: true });

export async function login(page: Page, u: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(u.email);
  await page.locator('input[name="password"]').fill(u.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/(admin|w)(\/|$)/);
}

// The message an ActionForm shows under its button.
export const okMsg = (page: Page) => page.locator(".msg.ok").first();
export const errMsg = (page: Page) => page.locator(".msg.err").first();

// Worker entry screens: fill, Review, Save.
export async function reviewAndSave(page: Page, screenshot?: string) {
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.locator("article.doc")).toBeVisible(); // invoice-style preview
  if (screenshot) await shot(page, screenshot);
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(page.locator(".msg.ok.big")).toBeVisible();
  return (await page.locator(".msg.ok.big").textContent()) ?? "";
}

export async function openParty(page: Page, list: "vendors" | "customers" | "labours", name: string) {
  await page.goto(`/admin/parties/${list}`);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}
