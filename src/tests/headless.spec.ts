import { test, expect } from "@playwright/test";

const testURL = (pathname: string) => `http://localhost:8080${pathname}`;

test("homepage anonymous", async ({ page }) => {
  await page.goto(testURL("/"));
  await expect(page).toHaveTitle("That's Groce!");
  const title = page.locator("h1");
  await expect(title).toHaveText("That's Groce!");
});

test("other pages anonymous", async ({ page }) => {
  await page.goto(testURL("/about"));

  await expect(page).toHaveTitle("About this app");
  const title = page.locator("h1");
  await expect(title).toHaveText("About this app");
  await page.locator("text=← Back to app").first().click();
  expect(page.url()).toBe(testURL("/"));
});

test("basics as guest", async ({ page }) => {
  await page.goto(testURL("/"));
  await page.click("text=Get started without signing in");
  await expect(
    page.locator("text=temporarily signed in").first()
  ).toBeVisible();
  await page.click('a:has-text("Groceries")');

  await expect(
    page.locator("text=List is empty at the moment.").first()
  ).toBeVisible();

  await page.fill('input[aria-label="New shopping list item"]', "Carrots");

  page.locator('button[type="submit"]').first().click();
  await expect(page.locator("text=Carrots 🥕").first()).toBeVisible();
  // await page.pause();
});
