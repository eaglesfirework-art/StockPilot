// Every entry form, filled by the person who would use it. September is the "previous period", October the current one.
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, RAVI, SURESH, errMsg, login, okMsg, openParty, reviewAndSave, shot } from "./helpers";

test.describe.configure({ mode: "serial" });

async function receive(page: Page, o: { vendor: string; date: string; item: string; qty: string; rate: string; paid?: string; ref?: string; shot?: string }) {
  await page.goto("/w/receive");
  await page.getByLabel("Vendor").selectOption({ label: o.vendor });
  await page.getByLabel("Date").fill(o.date);
  if (o.ref) await page.getByLabel("Reference no. (optional)").fill(o.ref);
  await page.getByLabel("Item").selectOption({ label: o.item });
  await page.getByLabel(/^Quantity/).fill(o.qty);
  await page.getByLabel("Rate (₹)").fill(o.rate);
  if (o.paid) await page.getByLabel("Paid now (₹, optional)").fill(o.paid);
  return reviewAndSave(page, o.shot);
}

async function batch(page: Page, o: { date: string; flour: string; sugar: string; produced: string; labour: string; gas: string; shot?: string }) {
  await page.goto("/w/production");
  await page.getByLabel("Product").selectOption({ label: "Biscuit pack" });
  await page.getByLabel("Date").fill(o.date);
  await page.getByLabel("Flour (kg)").fill(o.flour);
  await page.getByLabel("Sugar (kg)").fill(o.sugar);
  await page.getByLabel(/^Produced/).fill(o.produced);
  await page.getByRole("button", { name: "+ Add labour" }).click();
  const lab = page.locator(".card.line").nth(0);
  await lab.getByLabel("Labour").selectOption({ label: "Ramesh team" });
  await lab.getByLabel("Amount (₹)").fill(o.labour);
  await page.getByRole("button", { name: "+ Add expense" }).click();
  const exp = page.locator(".card.line").nth(1);
  await exp.getByLabel("What for").fill("gas");
  await exp.getByLabel("Amount (₹)").fill(o.gas);
  return reviewAndSave(page, o.shot);
}

async function sale(page: Page, o: { customer: string; date: string; qty: string; rate: string; received: string; shot?: string }) {
  await page.goto("/admin/sales/new");
  await page.getByLabel("Customer").selectOption({ label: o.customer });
  await page.getByLabel("Date").fill(o.date);
  await page.getByLabel("Product").selectOption({ label: "Biscuit pack" });
  await expect(page.getByLabel("Rate (₹)")).toHaveValue(""); // no fixed selling price: the rate is typed on each sale
  await page.getByLabel("Quantity").fill(o.qty);
  await page.getByLabel("Rate (₹)").fill(o.rate);
  await page.getByLabel("Received now (₹, optional)").fill(o.received);
  return reviewAndSave(page, o.shot);
}

test("worker Ravi receives flour and sugar (September)", async ({ page }) => {
  await login(page, RAVI);
  expect(await receive(page, { vendor: "Anand Flour Mills", date: "2026-09-05", item: "Flour", qty: "100", rate: "40", paid: "4000", ref: "INV-101" })).toContain("PUR-1 saved");
  expect(await receive(page, { vendor: "Shree Sugar Traders", date: "2026-09-05", item: "Sugar", qty: "50", rate: "50", paid: "2500" })).toContain("PUR-2 saved");
});

test("worker Suresh records a production batch (September)", async ({ page }) => {
  await login(page, SURESH);
  const msg = await batch(page, { date: "2026-09-06", flour: "50", sugar: "20", produced: "400", labour: "2000", gas: "500" });
  expect(msg).toContain("BAT-1 saved. Cost per unit ₹13.75");
});

test("admin sells to Metro Mart (September)", async ({ page }) => {
  await login(page, ADMIN);
  const msg = await sale(page, { customer: "Metro Mart", date: "2026-09-07", qty: "300", rate: "30", received: "9000" });
  expect(msg).toContain("SAL-1 saved for Metro Mart. Total ₹9,000.00, received ₹9,000.00, fully paid.");
  await expect(page.getByRole("link", { name: "Open Metro Mart's account →" })).toBeVisible();
});

test("worker Ravi receives flour at a higher rate (October)", async ({ page }) => {
  await login(page, RAVI);
  expect(await receive(page, { vendor: "Anand Flour Mills", date: "2026-10-10", item: "Flour", qty: "100", rate: "46", paid: "2000", ref: "INV-188", shot: "05b-review-purchase-bill" })).toContain("PUR-3 saved");
});

test("worker Suresh receives sugar on credit and records a batch that uses more material (October)", async ({ page }) => {
  await login(page, SURESH);
  expect(await receive(page, { vendor: "Shree Sugar Traders", date: "2026-10-10", item: "Sugar", qty: "50", rate: "56" })).toContain("PUR-4 saved");
  const msg = await batch(page, { date: "2026-10-12", flour: "60", sugar: "25", produced: "400", labour: "2400", gas: "600", shot: "06b-review-production-batch" });
  expect(msg).toContain("BAT-2 saved. Cost per unit ₹17.46");
  await shot(page, "06-worker-production-saved");
});

test("selling more than in stock is blocked", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/sales/new");
  await page.getByLabel("Customer").selectOption({ label: "City Bakers" });
  await page.getByLabel("Product").selectOption({ label: "Biscuit pack" });
  await expect(page.getByText("In stock: 500 piece")).toBeVisible();
  await page.getByLabel("Quantity").fill("9999");
  await page.getByLabel("Rate (₹)").fill("32");
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.locator("article.doc")).toContainText("Only 500 piece in stock"); // warned on the preview
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(page.locator(".msg.err.big")).toContainText("Only 500 piece of Biscuit pack available");
});

test("admin sells to City Bakers at a new price (October)", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/sales/new");
  await page.getByLabel("Product").selectOption({ label: "Biscuit pack" });
  await expect(page.getByText("last sold at ₹30.00 per piece")).toBeVisible(); // a hint, not a fixed price
  const msg = await sale(page, { customer: "City Bakers", date: "2026-10-15", qty: "200", rate: "32", received: "2000", shot: "08b-review-sales-invoice" });
  // a refused sale can use up a number, so do not assume SAL-2
  expect(msg).toMatch(/SAL-\d+ saved for City Bakers\. Total ₹6,400\.00, received ₹2,000\.00, ₹4,400\.00 still due\./);
  await shot(page, "08-sale-saved-with-link");
  await page.getByRole("link", { name: "Record payment from City Bakers →" }).click();
  await expect(page).toHaveURL(/\/admin\/party\//);
  await expect(page.getByRole("heading", { level: 1, name: "City Bakers" })).toBeVisible();
  await expect(page.getByTestId("closing-balance")).toHaveText("₹4,400.00");
  await expect(page.getByRole("button", { name: "Save receipt" })).toBeVisible();
});

test("worker Ravi pays labour for a work period (From and To)", async ({ page }) => {
  await login(page, RAVI);
  await page.goto("/w/labour");
  await page.getByLabel("Labour").selectOption({ label: "Ramesh team" });
  await page.getByLabel("Amount (₹)").fill("500");
  await page.getByLabel("Payment date").fill("2026-10-17");
  await page.getByLabel("Work from").fill("2026-10-17");
  await page.getByLabel("Work to").fill("2026-10-13");
  await page.getByLabel("Note").fill("advance");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(errMsg(page)).toHaveText("Work period: From cannot be after To");

  await page.getByLabel("Work from").fill("2026-10-13");
  await page.getByLabel("Work to").fill("2026-10-17");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(okMsg(page)).toContainText("Labour payment of ₹500.00 to Ramesh team saved");
  await expect(okMsg(page)).toContainText("Work 13 Oct 2026 to 17 Oct 2026.");
  await shot(page, "07-labour-work-period");
  await page.goto("/w");
  await expect(page.getByText("Labour payment to Ramesh team · ₹500.00 · Work 13 Oct 2026 to 17 Oct 2026 · advance")).toBeVisible();
});

test("vendor payment: no 'For bill' choice, payment saved on account", async ({ page }) => {
  await login(page, ADMIN);
  await openParty(page, "vendors", "Anand Flour Mills");
  await expect(page.getByLabel(/For bill|Against invoice/)).toHaveCount(0);
  // paying more than we owe (₹2,600) is refused, so a balance can never go below zero
  await page.getByLabel("Amount (₹)").fill("3000");
  await page.getByLabel("Date").first().fill("2026-10-18");
  await page.getByRole("button", { name: "Save payment" }).click();
  await expect(errMsg(page)).toHaveText("We owe Anand Flour Mills only ₹2,600.00. A payment cannot be more than that.");
  await page.getByLabel("Amount (₹)").fill("1000");
  await page.getByLabel("Date").first().fill("2026-10-18");
  await page.getByLabel("Note").fill("UPI");
  await page.getByRole("button", { name: "Save payment" }).click();
  await expect(okMsg(page)).toContainText("Payment of ₹1,000.00 to Anand Flour Mills saved");
});

test("customer receipt from City Bakers", async ({ page }) => {
  await login(page, ADMIN);
  await openParty(page, "customers", "City Bakers");
  await page.getByLabel("Amount (₹)").fill("1500");
  await page.getByLabel("Date").first().fill("2026-10-19");
  await page.getByRole("button", { name: "Save receipt" }).click();
  await expect(okMsg(page)).toContainText("Receipt of ₹1,500.00 from City Bakers saved");
});
