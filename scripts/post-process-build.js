#!/usr/bin/env node
const fs = require("fs");

const cheerio = require("cheerio");
const chalk = require("chalk");

const BUILD_FILE = "build/index.html";
const MANIFEST_FILE = "build/manifest.json";

const originalContent = fs.readFileSync(BUILD_FILE, "utf-8");
let content = originalContent;
const $ = cheerio.load(content);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE));

const metaTitle = $('meta[name="apple-mobile-web-app-title"]');
if (!metaTitle.length) {
  const tag = `<meta name="apple-mobile-web-app-title" content="${manifest.short_name}">`;
  $(tag).appendTo($("head"));
  console.log(`${chalk.green("Post-process injected:")} ${chalk.grey(tag)}`);
}

// This was generated from
// https://minimalcss.app/?url=https%3A%2F%2Fthatsgroce.web.app%2F
// as of Aug 28, 2020.
const MINIMAL_CSS = `/*!
* Bootstrap v5.0.0-alpha1 (https://getbootstrap.com/)
* Copyright 2011-2020 The Bootstrap Authors
* Copyright 2011-2020 Twitter, Inc.
* Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
*/
@keyframes spinner-border{to{transform:rotate(1turn)}}body,html{width:100%;padding:0;background:#fafafa;font-family:Helvetica Neue,arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}html{margin:0;font-weight:400;color:#444}*,:after,:before{box-sizing:border-box}#app,body,html{height:100%}:root{--bs-blue:#0d6efd;--bs-indigo:#6610f2;--bs-purple:#6f42c1;--bs-pink:#d63384;--bs-red:#dc3545;--bs-orange:#fd7e14;--bs-yellow:#ffc107;--bs-green:#28a745;--bs-teal:#20c997;--bs-cyan:#17a2b8;--bs-white:#fff;--bs-gray:#6c757d;--bs-gray-dark:#343a40;--bs-primary:#0d6efd;--bs-secondary:#6c757d;--bs-success:#28a745;--bs-info:#17a2b8;--bs-warning:#ffc107;--bs-danger:#dc3545;--bs-light:#f8f9fa;--bs-dark:#343a40;--bs-font-sans-serif:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";--bs-font-monospace:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;--bs-gradient:linear-gradient(180deg,hsla(0,0%,100%,0.15),hsla(0,0%,100%,0))}body{margin:0;font-family:var(--bs-font-sans-serif);font-size:1rem;font-weight:400;line-height:1.5;color:#212529;background-color:#fff;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}h1,p,ul{margin-top:0}h1{margin-bottom:.5rem;font-weight:500;line-height:1.2;font-size:calc(1.375rem + 1.5vw)}@media (min-width:1200px){h1{font-size:2.5rem}}p,ul{margin-bottom:1rem}ul{padding-left:2rem}ul ul{margin-bottom:0}strong{font-weight:bolder}a{color:#0d6efd;text-decoration:underline}a:hover{color:#024dbc}a:not([href]):not([class]),a:not([href]):not([class]):hover{color:inherit;text-decoration:none}img{vertical-align:middle}button{border-radius:0;margin:0;font-family:inherit;font-size:inherit;line-height:inherit;overflow:visible;text-transform:none}button:focus{outline:1px dotted;outline:5px auto -webkit-focus-ring-color}[role=button]{cursor:pointer}[type=button],button{-webkit-appearance:button}[type=button]:not(:disabled),button:not(:disabled){cursor:pointer}::-moz-focus-inner{padding:0;border-style:none}::-webkit-datetime-edit-day-field,::-webkit-datetime-edit-fields-wrapper,::-webkit-datetime-edit-hour-field,::-webkit-datetime-edit-minute,::-webkit-datetime-edit-month-field,::-webkit-datetime-edit-text,::-webkit-datetime-edit-year-field{padding:0}::-webkit-inner-spin-button{height:auto}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-color-swatch-wrapper{padding:0}::-webkit-file-upload-button{font:inherit;-webkit-appearance:button}.lead{font-size:1.25rem;font-weight:300}.display-1{font-size:calc(1.625rem + 4.5vw);font-weight:300;line-height:1.2}@media (min-width:1200px){.display-1{font-size:5rem}}.container,.container-md{width:100%;padding-right:1rem;padding-left:1rem;margin-right:auto;margin-left:auto}@media (min-width:576px){.container{max-width:540px}}@media (min-width:768px){.container,.container-md{max-width:720px}}@media (min-width:992px){.container,.container-md{max-width:960px}}@media (min-width:1200px){.container,.container-md{max-width:1140px}}@media (min-width:1400px){.container,.container-md{max-width:1320px}}.btn{display:inline-block;font-weight:400;line-height:1.5;color:#212529;text-align:center;text-decoration:none;vertical-align:middle;cursor:pointer;-webkit-user-select:none;-ms-user-select:none;user-select:none;background-color:transparent;border:1px solid transparent;padding:.375rem .75rem;font-size:1rem;border-radius:.25rem;transition:color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out}@media (prefers-reduced-motion:reduce){.btn{transition:none}}.btn:hover{color:#212529}.btn:focus{outline:0;box-shadow:0 0 0 .2rem rgba(13,110,253,.25)}.btn:disabled{pointer-events:none;opacity:.65}.btn-primary{color:#fff;background-color:#0d6efd;border-color:#0d6efd}.btn-primary:focus,.btn-primary:hover{color:#fff;background-color:#025ce2;border-color:#0257d5}.btn-primary:active:focus,.btn-primary:focus{box-shadow:0 0 0 .2rem rgba(49,132,253,.5)}.btn-primary:active{color:#fff;background-color:#0257d5;border-color:#0252c9}.btn-primary:disabled{color:#fff;background-color:#0d6efd;border-color:#0d6efd}.collapse:not(.show){display:none}.dropdown{position:relative}.dropdown-toggle{white-space:nowrap}.dropdown-toggle:after{display:inline-block;margin-left:.255em;vertical-align:.255em;content:"";border-top:.3em solid;border-right:.3em solid transparent;border-bottom:0;border-left:.3em solid transparent}.dropdown-toggle:empty:after{margin-left:0}.dropdown-menu{position:absolute;top:100%;left:0;z-index:1000;display:none;min-width:10rem;padding:.5rem 0;margin:.125rem 0 0;font-size:1rem;color:#212529;text-align:left;list-style:none;background-color:#fff;background-clip:padding-box;border:1px solid rgba(0,0,0,.15);border-radius:.25rem}.dropdown-item{display:block;width:100%;padding:.25rem 1rem;clear:both;font-weight:400;color:#212529;text-align:inherit;text-decoration:none;white-space:nowrap;background-color:transparent;border:0}.dropdown-item:focus,.dropdown-item:hover{color:#16181b;background-color:#f8f9fa}.dropdown-item:active{color:#fff;text-decoration:none;background-color:#0d6efd}.dropdown-item:disabled{color:#6c757d;pointer-events:none;background-color:transparent}.nav-link{display:block;padding:.5rem 1rem;text-decoration:none;transition:color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out}@media (prefers-reduced-motion:reduce){.nav-link{transition:none}}.navbar,.navbar>.container-md{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center;-ms-flex-pack:justify;justify-content:space-between}.navbar{position:relative;-ms-flex-wrap:wrap;flex-wrap:wrap;padding-top:.5rem;padding-bottom:.5rem}.navbar>.container-md{-ms-flex-wrap:inherit;flex-wrap:inherit}.navbar-brand{padding-top:.3125rem;padding-bottom:.3125rem;margin-right:1rem;font-size:1.25rem;text-decoration:none;white-space:nowrap}.navbar-nav{display:-ms-flexbox;display:flex;-ms-flex-direction:column;flex-direction:column;padding-left:0;margin-bottom:0;list-style:none}.navbar-nav .nav-link{padding-right:0;padding-left:0}.navbar-nav .dropdown-menu{position:static}.navbar-collapse{-ms-flex-align:center;align-items:center;width:100%}.navbar-toggler{padding:.25rem .75rem;font-size:1.25rem;line-height:1;background-color:transparent;border:1px solid transparent;border-radius:.25rem;transition:box-shadow .15s ease-in-out}@media (prefers-reduced-motion:reduce){.navbar-toggler{transition:none}}.navbar-toggler:hover{text-decoration:none}.navbar-toggler:focus{text-decoration:none;outline:0;box-shadow:0 0 0 .2rem}.navbar-toggler-icon{display:inline-block;width:1.5em;height:1.5em;vertical-align:middle;background-repeat:no-repeat;background-position:50%;background-size:100%}.navbar-light .navbar-brand,.navbar-light .navbar-brand:focus,.navbar-light .navbar-brand:hover{color:rgba(0,0,0,.9)}.navbar-light .navbar-nav .nav-link{color:rgba(0,0,0,.55)}.navbar-light .navbar-nav .nav-link:focus,.navbar-light .navbar-nav .nav-link:hover{color:rgba(0,0,0,.7)}.navbar-light .navbar-nav .nav-link.active{color:rgba(0,0,0,.9)}.navbar-light .navbar-toggler{color:rgba(0,0,0,.55);border-color:rgba(0,0,0,.1)}.navbar-light .navbar-toggler-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3E%3Cpath stroke='rgba(0,0,0,0.55)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3E%3C/svg%3E")}.spinner-border{display:inline-block;width:2rem;height:2rem;vertical-align:text-bottom;border:.25em solid;border-right:.25em solid transparent;border-radius:50%;animation:spinner-border .75s linear infinite}.fixed-bottom{position:fixed;right:0;left:0;z-index:1030;bottom:0}.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.align-top{vertical-align:top!important}.d-inline-block{display:inline-block!important}.m-5{margin:3rem!important}.mr-auto{margin-right:auto!important}.mb-2{margin-bottom:.5rem!important}.text-center{text-align:center!important}.text-success{color:#28a745!important}.bg-light{background-color:#f8f9fa!important}@media (min-width:992px){.mb-lg-0{margin-bottom:0!important}}div.main{padding-bottom:80px}.home__5d1wS{padding-top:90px}.login__3XFRD{margin-top:40px}.loading__13oxT{text-align:center}`;

// The critical CSS made my `minimalcss` is much better than that made with
// preact-cli which uses `critters-webpack-plugin`.
// Manually inject our own.

$('link[rel="stylesheet"][href]').each((i, element) => {
  const href = $(element).attr("href");
  $(
    `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'"/>`
  ).insertAfter($(element));
  $(`<noscript><link rel="stylesheet" href="${href}"></noscript>`).insertAfter(
    $(element)
  );
  $(element).remove();
});
// Most important that it's *above* all other lazy-loaded link[rel=stylesheet]
// tags otherwise it goes nuts.
$('<style type="text/css">').html(MINIMAL_CSS).insertAfter("title");

content = $.html().replace(/this.media=&apos;all&apos;/g, "this.media='all'");
if (content !== originalContent) {
  fs.writeFileSync(BUILD_FILE, content, "utf-8");
}
