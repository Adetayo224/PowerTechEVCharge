import { test, expect } from "@playwright/test";

const DRIVER = { email: "driver@demo.powertech.ng", password: "Demo1234!" };

test("driver signs in, finds a station, opens details and books a slot", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(DRIVER.email);
  await page.getByLabel("Password").fill(DRIVER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/driver\/map/);

  await page.getByRole("link", { name: /^Search$/ }).click();
  await expect(page).toHaveURL(/\/driver\/search/);
  await page.getByPlaceholder(/search by area/i).fill("Lekki");
  const firstCard = page.locator("a[href^='/driver/stations/']").first();
  await firstCard.click();

  const bookBtn = page.getByRole("link", { name: /^Book$/ }).first();
  await bookBtn.click();

  const availableSlot = page.locator("button:not([disabled])", { hasText: /^\d{2}:\d{2}$/ }).first();
  await availableSlot.click();
  await page.getByRole("button", { name: /confirm booking/i }).click();

  await expect(page.getByText(/booking confirmed/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("text=/^[A-Z2-9]{8}$/")).toBeVisible();
});
