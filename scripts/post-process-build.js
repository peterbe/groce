#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const httpServer = require("http-server");
const chalk = require("chalk");
const cheerio = require("cheerio");
const minimalcss = require("minimalcss");
const puppeteer = require("puppeteer");

const getPrerenderURLs = require("../prerender-urls");

const HTTP_SERVER_PORT = 8888;

const ABSOLUTE_URL_BASE = "https://thatsgroce.web.app";

/** Note!
 * You're going to get
 *
 *   [DEP0066] DeprecationWarning: OutgoingMessage.prototype._headers is deprecated
 *
 * when using Node >=12
 * See https://github.com/http-party/http-server/issues/537
 */

async function main() {
  const buildRoot = path.resolve("build");

  // const browser = await puppeteer.launch();
  const server = httpServer.createServer({ root: buildRoot });
  server.listen(HTTP_SERVER_PORT);
  try {
    // await run(browser, buildRoot);
    await run(buildRoot);
  } catch (error) {
    console.error(chalk.red(error));
    process.exitCode = 1;
    // throw error;
  } finally {
    // await browser.close();
    server.close();
  }
}

async function run(buildRoot) {
  const MANIFEST_FILE = "build/manifest.json";
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE));

  for (const prerenderURL of getPrerenderURLs()) {
    const buildFile = path.join(
      buildRoot,
      prerenderURL.url.slice(1),
      "index.html",
    );
    const originalContent = fs.readFileSync(buildFile, "utf-8");
    let content = originalContent;
    const $ = cheerio.load(content);

    const metaTitle = $('meta[name="apple-mobile-web-app-title"]');
    if (!metaTitle.length) {
      const tag = `<meta name="apple-mobile-web-app-title" content="${manifest.short_name}">`;
      $(tag).appendTo($("head"));
      console.log(
        `${chalk.green("Post-process injected:")} ${chalk.grey(tag)}`,
      );
    }
    const metaDescription = $('meta[name="description"]');
    if (!metaDescription.length) {
      const description =
        "A mobile web app to help families perfect grocery shopping.";
      const tag = `<meta name="description" content="${description}">`;
      $(tag).appendTo($("head"));
      console.log(
        `${chalk.green("Post-process injected:")} ${chalk.grey(tag)}`,
      );
    }

    const largestIcon = manifest.icons
      .filter((icon) => !icon.purpose)
      .sort((a, b) => {
        return parseInt(b.sizes) - parseInt(a.sizes);
      })[0];
    if (largestIcon) {
      const metaOGURL = $('meta[property="og:image"]');
      if (!metaOGURL.length) {
        const imageURL = largestIcon.src.includes("://")
          ? largestIcon.src
          : `${ABSOLUTE_URL_BASE}${largestIcon.src}`;
        const tag = `<meta property="og:image" content="${imageURL}">`;
        $(tag).appendTo($("head"));
        console.log(
          `${chalk.green("Post-process injected:")} ${chalk.grey(tag)}`,
        );
        const [width, height] = largestIcon.sizes
          .split(" ")[0]
          .split("x")
          .map((x) => parseInt(x));
        const tagWidth = `<meta property="og:image:width" content="${width}">`;
        $(tagWidth).appendTo($("head"));
        console.log(
          `${chalk.green("Post-process injected:")} ${chalk.grey(tagWidth)}`,
        );
        const tagHeight = `<meta property="og:image:height" content="${height}">`;
        $(tagHeight).appendTo($("head"));
        console.log(
          `${chalk.green("Post-process injected:")} ${chalk.grey(tagHeight)}`,
        );
      }
    }

    // The critical CSS made my `minimalcss` is much better than that made with
    // preact-cli which uses `critters-webpack-plugin`.
    const uri = prerenderURL.url;

    const url = `http://localhost:${HTTP_SERVER_PORT}${uri}`;
    // It's safer to create a new browser for every URL because of
    // service workers.
    const browser = await puppeteer.launch();
    try {
      result = await minimalcss.minimize({
        browser,
        urls: [url],
        withoutjavascript: false,
        skippable: (request) => {
          const requestURL = new URL(request.url());
          return !(
            requestURL.host === new URL(url).host ||
            requestURL.host.includes("firebaseinstallations")
          );
        },
      });
    } catch (error) {
      console.log(`Problem running minimize on ${uri}`);
      throw error;
    } finally {
      await browser.close();
    }
    const stylesheetsFound = Object.keys(result.stylesheetContents).map(
      (u) => new URL(u).pathname,
    );

    $('link[rel="stylesheet"]').each((_, element) => {
      const $element = $(element);
      if (
        !$element.attr("media") &&
        stylesheetsFound.includes($element.attr("href"))
      ) {
        $element.attr("media", "print");
        $element.attr("onload", "this.media='all'");
      }
    });

    // Most important that it's *above* all other lazy-loaded link[rel=stylesheet]
    // tags otherwise it goes nuts.
    $('<style type="text/css">').text(result.finalCss).insertAfter("title");
    console.log(`${chalk.green("Inlined minimal CSS:")} ${chalk.grey(uri)}`);

    content = $.html().replace(
      /this.media=&apos;all&apos;/g,
      "this.media='all'",
    );
    if (content !== originalContent) {
      fs.writeFileSync(buildFile, content, "utf-8");
      console.log(`${chalk.bold.green("Wrote")} ${chalk.grey(buildFile)}`);
    }
  }
}

if (require.main === module) {
  main();
}
