import { test, expect, Page } from "@playwright/test";

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
  await page.keyboard.press("Enter");
  await expect(page.locator("text=Carrots 🥕").first()).toBeVisible();
});

test("submit feedback", async ({ page }) => {
  await page.goto(testURL("/feedback"));
  await expect(
    page.locator(`text=You have to be signed in to post feedback`).first()
  ).toBeVisible();

  await page.goto(testURL("/"));
  await page.click("text=Get started without signing in");
  await page.waitForSelector("text=temporarily signed in");

  await page.goto(testURL("/feedback"));
  await page.waitForSelector(`text=You're not actually signed in.`);
  await page.click("text=Sign in properly");
  expect(page.url()).toBe(testURL("/signin"));
  await page.click("text=Sign in with Google");

  // await page.pause();
});
