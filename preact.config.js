// Origins of this is @developit helping me solve this problem:
// https://github.com/firebase/firebase-js-sdk/issues/5492

export default (config, env, helpers) => {
  const { rule } = helpers.getLoadersByName(config, "babel-loader")[0];

  const babelConfig = rule.options;
  const index = babelConfig.plugins.findIndex((x) => {
    if (Array.isArray(x)) {
      return /fast-async/.test(x[0]);
    }
    if (typeof x === "string") {
      return /fast-async/.test(x);
    }
    console.warn(`Not sure how to deal with type ${typeof x} (${x})`);
    return false;
  });
  if (index !== -1) {
    // console.debug("Removing babelConfig", babelConfig.plugins[index]);
    babelConfig.plugins.splice(index, 1);
  }

  return config;
};

// export default (config, env, helpers) => {
//   return config;
// };
