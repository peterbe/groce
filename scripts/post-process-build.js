#!/usr/bin/env node
const fs = require("fs");

const BUILD_FILE = "build/index.html";
const MANIFEST_FILE = "build/manifest.json";

const originalContent = fs.readFileSync(BUILD_FILE, "utf-8");
let content = originalContent;

const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE));
if (!content.includes("apple-mobile-web-app-title")) {
  const tag = `<meta name="apple-mobile-web-app-title" content="${manifest.short_name}">`;
  console.assert(!content.includes(tag));
  console.log("Post-process inject:", tag);
  content = content.replace("</head>", `${tag}</head>`);
}

if (content !== originalContent) {
  fs.writeFileSync(BUILD_FILE, content, "utf-8");
}
