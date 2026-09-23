import { test, expect } from "@playwright/test";

const OPERATOR = { email: "operator@demo.powertech.ng", password: "Demo1234!" };

test("operator signs in, sets a charger offline, sees offline badge", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(OPERATOR.email);
  await page.getByLabel("Password").fill(OPERATOR.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/operator\/dashboard/);

  await page.getByRole("link", { name: /^Stations$/ }).click();
  await page.locator("a[href^='/operator/stations/']").first().click();

  const offlineBtn = page.getByRole("button", { name: /^offline$/i }).first();
  await offlineBtn.click();
  await expect(page.getByText(/Offline/i).first()).toBeVisible();
});
