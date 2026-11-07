// Atomic checks, starting from an empty system with one admin.
import { expect, test } from "@playwright/test";
import { ADMIN, RAVI, SURESH, errMsg, login, okMsg, openParty, shot } from "./helpers";

test.describe.configure({ mode: "serial" });

test("login: the password can be shown and hidden", async ({ page }) => {
  await page.goto("/login");
  const pw = page.locator('input[name="password"]');
  await pw.fill(ADMIN.password);
  await expect(pw).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(pw).toHaveAttribute("type", "text");
  await expect(pw).toHaveValue(ADMIN.password);
  await shot(page, "01-login-password-shown");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(pw).toHaveAttribute("type", "password");
});

test("login: a wrong password is refused", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.locator('input[name="password"]').fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(errMsg(page)).toHaveText("Wrong email or password");
});

test("admin creates two worker accounts", async ({ page }) => {
  await login(page, ADMIN);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/users");
  for (const w of [RAVI, SURESH]) {
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Create user" }) });
    await form.getByLabel("Name").fill(w.name);
    await form.getByLabel("Email").fill(w.email);
    await form.getByLabel("Role").selectOption("WORKER");
    const pw = form.locator('input[name="password"]');
    await pw.fill(w.password);
    await form.getByRole("button", { name: "Show password" }).click(); // the admin can check what they typed
    await expect(pw).toHaveAttribute("type", "text");
    await form.getByRole("button", { name: "Create user" }).click();
    await expect(page.getByRole("cell", { name: w.email })).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: w.email })).toContainText("Manager"); // role is called Manager on screen
    await expect(okMsg(page)).toHaveText("User created");
    await expect(pw).toHaveAttribute("type", "password"); // hidden again after the form clears
  }
  await shot(page, "02-users-created");
});

test("admin adds raw materials", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/raw-materials");
  for (const [name, min] of [["Flour", "50"], ["Sugar", "20"]]) {
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Unit").selectOption("kg");
    await page.getByLabel(/Minimum stock/).fill(min);
    await page.getByRole("button", { name: "Add raw material" }).click();
    await expect(okMsg(page)).toHaveText(`${name} added to Raw Materials`);
  }
  await page.getByLabel("Name", { exact: true }).fill("flour");
  await page.getByRole("button", { name: "Add raw material" }).click();
  await expect(errMsg(page)).toContainText("already exists");
});

test("admin adds a finished product: no selling price, at least one raw material required", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/products");
  await expect(page.getByLabel(/Selling price/)).toHaveCount(0);
  await page.getByLabel("Name", { exact: true }).fill("Biscuit pack");
  await page.getByLabel("Unit").selectOption("piece");
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(errMsg(page)).toHaveText("Choose at least one raw material this product is made from");

  await page.getByLabel("Flour (kg)").check();
  await page.getByLabel("Sugar (kg)").check();
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(okMsg(page)).toHaveText("Biscuit pack added to Products");
  await expect(page.getByText("Flour (kg), Sugar (kg)")).toBeVisible();
  await shot(page, "03-product-with-materials");

  // editing cannot take away the last raw material either
  await page.getByRole("button", { name: "Edit Biscuit pack" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByLabel(/Selling price/)).toHaveCount(0);
  await dlg.getByLabel("Flour (kg)").uncheck();
  await dlg.getByLabel("Sugar (kg)").uncheck();
  await dlg.getByRole("button", { name: "Save changes" }).click();
  await expect(dlg.locator(".msg.err")).toHaveText("Choose at least one raw material this product is made from");
  await dlg.getByRole("button", { name: "Cancel" }).click();
});

test("admin adds vendors: just a name and phone, no outstanding amount", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/parties/vendors");
  await expect(page.getByLabel(/Outstanding/)).toHaveCount(0);
  await expect(page.locator("th", { hasText: /Outstanding|Opening/ })).toHaveCount(0);
  const add = async (name: string, phone: string) => {
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Mobile (India, optional)").fill(phone);
    await page.getByRole("button", { name: "Add", exact: true }).click();
  };
  await add("Anand Flour Mills", "98765 43210");
  await expect(okMsg(page)).toHaveText("Added");
  await add("Shree Sugar Traders", "");
  await expect(okMsg(page)).toHaveText("Added");
  await expect(page.locator("tbody tr", { hasText: "Shree Sugar Traders" })).toContainText("₹0.00");
});

test("duplicate vendors are blocked: same name typed differently, or same phone", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/parties/vendors");
  await page.getByLabel("Name", { exact: true }).fill("  anand   FLOUR mills. ");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(errMsg(page)).toContainText('A vendor named "Anand Flour Mills" already exists');
  await shot(page, "04-duplicate-vendor-blocked");

  await page.getByLabel("Name", { exact: true }).fill("Anand Mills Branch");
  await page.getByLabel("Mobile (India, optional)").fill("+91 9876543210");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(errMsg(page)).toContainText("already uses this phone number");
  await expect(page.locator("tbody tr")).toHaveCount(2);
});

test("admin adds customers and a labour team", async ({ page }) => {
  await login(page, ADMIN);
  for (const [list, names] of [["customers", ["Metro Mart", "City Bakers"]], ["labours", ["Ramesh team"]]] as const) {
    await page.goto(`/admin/parties/${list}`);
    for (const name of names) {
      await page.getByLabel("Name", { exact: true }).fill(name);
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await expect(okMsg(page)).toHaveText("Added");
    }
  }
});


test("a vendor's page has only the payment form and the statement (no balance to type in)", async ({ page }) => {
  await login(page, ADMIN);
  await openParty(page, "vendors", "Shree Sugar Traders");
  await expect(page.getByTestId("closing-balance")).toHaveText("₹0.00");
  await expect(page.getByText(/Outstanding/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Update balance" })).toHaveCount(0);
});

test("worker sees a profile icon that opens their profile, and has no admin access", async ({ page }) => {
  await login(page, RAVI);
  await expect(page).toHaveURL(/\/w$/);
  const avatar = page.getByRole("link", { name: `My profile (${RAVI.name})` });
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveText("RK");
  await shot(page, "05-worker-home-profile-icon");
  await avatar.click();
  await expect(page).toHaveURL(/\/w\/profile$/);
  await expect(page.getByText(RAVI.email)).toBeVisible();
  await expect(page.getByText("Manager", { exact: true })).toBeVisible(); // role label
  // the change-password boxes have show/hide too
  await expect(page.getByRole("button", { name: "Show password" })).toHaveCount(3);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/w$/);
});
