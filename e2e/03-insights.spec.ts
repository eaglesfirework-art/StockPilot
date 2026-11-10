// End to end: after the September and October entries made through the screens (02-forms), the vendor statement reads
// clearly and the Insights page answers the nine business questions with the hand-worked numbers below.
import { expect, test } from "@playwright/test";
import { ADMIN, login, openParty, shot } from "./helpers";

test.describe.configure({ mode: "serial" });

test("vendor statement lists only money entries, in plain words (no opening balance, no 'PAY-n')", async ({ page }) => {
  await login(page, ADMIN);
  await openParty(page, "vendors", "Anand Flour Mills");
  await page.goto(page.url() + "?from=2026-09-01&to=2026-10-31");
  const body = page.locator("table.statement tbody");
  const titles = await body.locator("td:nth-child(2) b").allTextContents();
  expect(titles).toEqual([
    "Purchase bill PUR-1",
    "Paid at the time of purchase (bill PUR-1)",
    "Purchase bill PUR-3",
    "Paid at the time of purchase (bill PUR-3)",
    "Payment to vendor",
  ]);
  await expect(body).toContainText("Flour 100 kg @ ₹40.00 · Supplier ref INV-101");
  await expect(body).toContainText("Flour 100 kg @ ₹46.00 · Supplier ref INV-188");
  await expect(body).not.toContainText(/PAY-\d|Outstanding|Opening/);
  // running balance from zero: 4000 → 0 → 4600 → 2600 → 1600
  const bal = await body.locator("td:last-child").allTextContents();
  expect(bal).toEqual(["₹4,000.00", "₹0.00", "₹4,600.00", "₹2,600.00", "₹1,600.00"]);
  await expect(page.getByTestId("closing-balance")).toHaveText("₹1,600.00");
  await shot(page, "09-vendor-statement");
});

test("vendor statement for October only starts with the balance brought forward", async ({ page }) => {
  await login(page, ADMIN);
  await openParty(page, "vendors", "Anand Flour Mills");
  await page.goto(page.url() + "?from=2026-10-01&to=2026-10-31");
  const first = page.locator("table.statement tbody tr").first();
  await expect(first).toContainText("Balance brought forward");
  await expect(first).toContainText("₹0.00");
});

test("labour statement names the batch and the work period of each payment", async ({ page }) => {
  await login(page, ADMIN);
  await openParty(page, "labours", "Ramesh team");
  await page.goto(page.url() + "?from=2026-09-01&to=2026-10-31");
  const titles = await page.locator("table.statement tbody td:nth-child(2) b").allTextContents();
  expect(titles).toEqual(["Labour for production batch BAT-1 (Biscuit pack)", "Labour for production batch BAT-2 (Biscuit pack)", "Labour payment"]);
  const details = await page.locator("table.statement tbody td:nth-child(2) .sub").allTextContents();
  expect(details).toEqual(["Work on 06 Sept 2026", "Work on 12 Oct 2026", "Work 13 Oct 2026 to 17 Oct 2026 · advance"]);
});

test("payments can be filtered by labour work period", async ({ page }) => {
  await login(page, ADMIN);
  // by payment date, 16-20 Oct has the labour advance (17th), the vendor payment (18th) and the receipt (19th)
  await page.goto("/admin/transactions?tab=payments&from=2026-10-16&to=2026-10-20");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  // by work period, 10-12 Oct: the batch labour of 12 Oct only (the advance covers 13-17 Oct)
  await page.goto("/admin/transactions?tab=payments&from=2026-10-10&to=2026-10-12");
  await page.getByLabel("Dates match").selectOption("work");
  await expect(page).toHaveURL(/by=work/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr").first()).toContainText("₹2,400.00");
  await expect(page.locator("tbody tr").first()).toContainText("12 Oct 2026");
  // by work period, 15-16 Oct: only the advance (work 13-17 Oct), although it was paid on the 17th
  await page.goto("/admin/transactions?tab=payments&from=2026-10-15&to=2026-10-16&by=work");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr").first()).toContainText("13 Oct 2026 to 17 Oct 2026");
  await shot(page, "10-payments-by-work-period");
});

test.describe("Insights answer the nine business questions (October vs September)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/admin/insights?from=2026-10-01&to=2026-10-30");
    await expect(page.getByRole("heading", { name: "Business insights" })).toBeVisible();
  });
  const answer = (page: import("@playwright/test").Page, id: string) => page.getByTestId(`${id}-answer`);

  test("Q1 how much money is being spent", async ({ page }) => {
    // paid out: vendors 2000 + 1000, labour 2400 + 500, gas 600 = 6500 (Sept: 4000 + 2500 + 2000 + 500 = 9000)
    await expect(answer(page, "q-spent")).toHaveText("₹6,500.00 was paid out in this period, less than ₹9,000.00 before. Purchase bills worth ₹7,400.00 came in (paid or not).");
  });
  test("Q2 how much money is being earned", async ({ page }) => {
    await expect(answer(page, "q-earned")).toHaveText("Customers paid ₹3,500.00 in this period against ₹6,400.00 of sales, down from ₹9,000.00 of sales before.");
  });
  test("Q3 how much customers owe us", async ({ page }) => {
    // City Bakers: 6400 − 2000 − 1500
    await expect(answer(page, "q-receivable")).toHaveText("₹2,900.00 is still to be collected; the largest is City Bakers at ₹2,900.00.");
  });
  test("Q4 how much we owe vendors", async ({ page }) => {
    // Shree: 2500 + 2800 − 2500 = 2800. Anand: 8600 − 7000 = 1600. No opening balances.
    await expect(answer(page, "q-payable")).toHaveText("₹4,400.00 is due to vendors (bills minus payments); the largest is Shree Sugar Traders at ₹2,800.00.");
  });
  test("Q5 which raw materials are becoming more expensive", async ({ page }) => {
    await expect(answer(page, "q-prices")).toHaveText("Flour (+15%), Sugar (+12%) cost more per unit than in the previous period.");
    await expect(page.locator("#q-prices tbody tr").first()).toContainText("₹40.00/kg");
  });
  test("Q6 is production consuming more raw material than before", async ({ page }) => {
    // sugar 20 → 25 kg per 400 packs, flour 50 → 60 kg per 400 packs
    await expect(answer(page, "q-consumption")).toHaveText("Yes. Per good unit, more Sugar (+25%) for Biscuit pack, Flour (+20%) for Biscuit pack was used than before.");
  });
  test("Q7 how production costs are changing", async ({ page }) => {
    await expect(answer(page, "q-unitcost")).toHaveText("One Biscuit pack now costs ₹17.46 to make, up from ₹13.75 (+27%).");
  });
  test("Q8 is profitability improving or declining", async ({ page }) => {
    await expect(answer(page, "q-profit")).toHaveText("Declining: net margin is 39.9% against 54.2% before (down 14.2 points). Net profit ₹2,556.50 vs ₹4,875.00.");
  });
  test("Q9 where the money is going", async ({ page }) => {
    await expect(answer(page, "q-spending")).toHaveText("Of ₹6,500.00 paid out, the most went to vendors (raw materials) (46.2%).");
    await shot(page, "11-insights-october");
  });
});

test("dashboard: profit = sales − raw materials − labour, and who owes what", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin?from=2026-10-01&to=2026-10-30");
  // October: 6,400 sold − 7,400 raw materials bought − 2,900 labour = 3,900 loss (September: 9,000 − 6,500 − 2,000 = 500 profit)
  const profit = page.getByTestId("dash-profit");
  await expect(profit.locator(".kpi-label")).toHaveText("Profit");
  await expect(profit.locator(".kpi-value")).toHaveText("₹3,900");
  await expect(profit.locator(".kpi-value")).toHaveClass(/bad-v/);
  await expect(profit).toContainText("vs ₹500 in the previous 30 days");
  const calc = page.getByTestId("dash-calc");
  await expect(calc.locator("tbody tr").nth(0)).toContainText("₹6,400.00");
  await expect(calc.locator("tbody tr").nth(1)).toContainText("₹7,400.00");
  await expect(calc.locator("tbody tr").nth(2)).toContainText("₹2,900.00");
  await expect(calc.locator("tbody tr").nth(3)).toContainText("₹3,900.00");
  await expect(calc.locator("tbody tr").nth(3)).not.toContainText("loss");
  await expect(calc.locator("tbody tr").nth(3)).toContainText("₹500.00");
  await expect(page.locator("main")).not.toContainText(/[−-]₹/); // no negative amounts anywhere
  await expect(page.getByTestId("dash-receivable").locator(".kpi-value")).toHaveText("₹2,900");
  await expect(page.getByTestId("dash-payable").locator(".kpi-value")).toHaveText("₹4,400");
  await shot(page, "12-dashboard-october");
  await page.getByTestId("dash-payable").getByRole("link", { name: "See who →" }).click();
  await expect(page).toHaveURL(/\/admin\/parties\/vendors\?due=1/);
  await expect(page.locator("tbody tr")).toHaveCount(2); // only the vendors we owe
});
