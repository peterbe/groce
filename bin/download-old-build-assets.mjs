#!/usr/bin/env node
import fs from "fs";
import path from "path";

import got from "got";

const BASE_URL = "https://thatsgroce.web.app/push-manifest.json";
const BUILD = "./build";

console.assert(fs.existsSync(BUILD));

async function download(uri) {
  const url = new URL(uri, BASE_URL);
  const fp = path.join(BUILD, uri.slice(1));
  return new Promise(async (resolve, reject) => {
    if (fs.existsSync(fp)) {
      console.log(fp.padEnd(80), "✅");
      resolve(fp);
    } else {
      // console.log(uri.padEnd(80), "⏳");
      try {
        const buffer = await got(url, {
          responseType: "buffer",
          resolveBodyOnly: true,
          timeout: 10000,
          retry: 3,
        });
        fs.writeFileSync(fp, buffer);
        console.log(fp.padEnd(80), "🎉");
        resolve(fp);
      } catch (err) {
        // console.warn(`Unable to download ${url}`, err);
        console.log(uri.padEnd(80), "💥 😖");
        reject(err);
      }
    }
  });
}
async function main() {
  try {
    const { body: manifest } = await got(BASE_URL, { responseType: "json" });
    const flat = Array.from(
      new Set([
        ...Object.values(manifest)
          .map((obj) => {
            return Object.keys(obj);
          })
          .flat(),
      ])
    );
    await Promise.all(flat.map(async (uri) => await download(`/${uri}`)));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

main();
