module.exports = {
  server: {
    command: "serve -s -p 4444 build",
    port: 4444,
  },
  launch: {
    headless: !JSON.parse(process.env.JEST_PUPPETEER_OPEN_BROWSER || "false"),
  },
};
