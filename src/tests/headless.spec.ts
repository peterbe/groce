import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  await expect(page).toHaveTitle("That's Groce!");
  const title = page.locator('h1');
  await expect(title).toHaveText("That's Groce!");

  await page.click('text=Get started without signing in');
});
