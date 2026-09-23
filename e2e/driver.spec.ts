import { test, expect } from "@playwright/test";

const DRIVER = { email: "driver@demo.powertech.ng", password: "Demo1234!" };

test("driver signs in and lands on Home", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(DRIVER.email);
  await page.getByLabel("Password").fill(DRIVER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/driver\/home/);
  await expect(page.getByText(/my vehicle/i)).toBeVisible();
});

test("driver opens map and sees stations", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(DRIVER.email);
  await page.getByLabel("Password").fill(DRIVER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/driver\/home/);
  await page.getByRole("link", { name: /^Map$/ }).click();
  await expect(page).toHaveURL(/\/driver\/map/);
  await expect(page.getByPlaceholder(/search station/i)).toBeVisible();
});
