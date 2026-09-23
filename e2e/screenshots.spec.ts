import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const DRIVER = { email: "driver@demo.powertech.ng", password: "Demo1234!" };
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false });
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    localStorage.setItem("theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
  await page.waitForTimeout(200);
}

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(DRIVER.email);
  await page.getByLabel("Password").fill(DRIVER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/driver\/home/, { timeout: 20_000 });
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`Screenshots (${theme})`, () => {
    test("driver flow snapshots", async ({ page }) => {
      await page.goto("/");
      await setTheme(page, theme);

      await page.goto("/");
      await shot(page, `${theme}-01-cover`);

      await page.goto("/sign-in");
      await shot(page, `${theme}-02-signin`);

      await signIn(page);
      await shot(page, `${theme}-03-home`);

      await page.goto("/driver/map");
      await page.waitForTimeout(1500);
      await shot(page, `${theme}-04-map`);

      // Drop a car in Lekki (approx pixel offset on the map area).
      await page.mouse.click(200, 200);
      await page.waitForTimeout(1200);
      await shot(page, `${theme}-05-map-with-car`);

      await page.goto("/driver/bookings");
      await shot(page, `${theme}-06-bookings`);

      await page.goto("/driver/profile");
      await shot(page, `${theme}-07-profile`);
    });
  });
}

// Cover the offline page (no auth needed)
test("offline screenshot", async ({ page }) => {
  await page.goto("/offline");
  await shot(page, `light-08-offline`);
});
