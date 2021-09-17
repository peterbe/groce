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
  await page.waitForSelector(`text=temporarily signed in`);
  await page.click('a:has-text("Groceries")');

  // Commented out because for some bizarre reason, this is sometimes
  // not working in CI. But almost always works locally.
  // await page.screenshot({
  //   path: "test-screenshots/empty-list-before.png",
  //   fullPage: true,
  // });
  // await page.waitForSelector(`text=List is empty at the moment.`);
  // await page.screenshot({
  //   path: "test-screenshots/empty-list-waited.png",
  //   fullPage: true,
  // });

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
  await expect(page).toHaveTitle("Sign in");
  expect(page.url()).toBe(testURL("/signin"));

  await page.click(`button:has-text("Sign in with Google")`);
  await page.waitForSelector(`text=Add new account`);
  await page.waitForLoadState("networkidle");

  await page.click(`text="Add new account"`);
  await page.waitForSelector(`text=Auto-generate user information`);
  await page.click(`text="Auto-generate user information"`);
  await page.waitForLoadState("networkidle");
  await page.click(`text="Sign in with"`);

  await page.goto(testURL("/feedback"));
  await page.waitForSelector(`text=Submit feedback`);
  await page.fill("#id_subject", "Hey there!");
  await page.fill("#id_text", "This is the text");
  await page.click(`text=Submit feedback`);

  await page.waitForSelector(`text=Feedback submitted`);

  // await page.pause();
});
