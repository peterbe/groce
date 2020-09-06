import "expect-puppeteer";

describe("Home page", () => {
  it("go to the home page", async () => {
    await page.goto("http://localhost:4444");
    // console.log(await page.content());
    // await jestPuppeteer.debug();
    await expect(page).toMatch("Sign in with Google");
  });
  it("go to the about page", async () => {
    await page.goto("http://localhost:4444/about");
    await expect(page).toMatch("Frequently asked questions");
  });
});
