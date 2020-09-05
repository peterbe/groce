const manifest = require("./src/manifest.json");

module.exports = function () {
  return [
    {
      url: "/",
      title: manifest.name,
    },
    {
      url: "/about",
      title: "About That's Groce!",
    },
  ];
};
