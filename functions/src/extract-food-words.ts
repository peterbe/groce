const escapeNeedle = (needle: string) =>
  needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type Options = {
  ignore?: string[];
  aliases?: Map<string, string>;
};
export function getFoodWords(
  text: string,
  listItems: string[],
  options: Options = {}
) {
  const possibleFoodWords = [...new Set(listItems.map(t => t.toLowerCase()))];

  possibleFoodWords.sort((a, b) => b.length - a.length);

  type Find = { word: string; index: number };
  const finds: Find[] = [];
  text = text.replace(/\n/g, " ").replace(/\s\s+/, " ");

  /**
   * XXX Might be worth treating the text that might have line
   * delimiter as one word. E.g.
   *       "poor some extra-"
   *       "virgin olive oil"
   * so that it becomes:
   *       "poor some extra-virgin olive oil"
   * so that it can match on the word:
   *       "extra-virgin olive"
   *  */

  const textLC = text.toLowerCase();

  const ignoresLC = new Set(
    (options.ignore || []).map(word => word.toLowerCase())
  );
  const aliases: Map<string, string> = new Map();
  if (options.aliases) {
    for (const [key, value] of options.aliases.entries()) {
      aliases.set(key.toLowerCase(), value);
    }
  }

  for (const word of possibleFoodWords) {
    // This is an optimization...
    // The list of possibleFoodWords might be huge. Possibly thousands
    // of words.
    // Because we're ultimately only want to regex match the words
    // if they appear at all, but with word boundary. Therefore
    // we can do a quick check if the string appears at all in the text.
    // Now, if 'garlic' doesn't appear at all anywhere in the text,
    // word boundaries or not, we don't need to bother to
    // do a regex search for `/\bgarlic\b/`.
    if (textLC.indexOf(word) === -1) {
      continue;
    }

    if (ignoresLC.has(word)) {
      continue;
    }

    const rex = new RegExp(`\\b${escapeNeedle(word)}\\b`, "i");
    const match = text.match(rex);
    if (!match) {
      continue;
    }
    const found = match[0];
    const alias = aliases.get(found.toLowerCase());

    finds.push({
      word: alias || found,
      index: match.index || 0
    });
    text = text.replace(rex, " ");
  }
  // Sort by the location they were found in the text.
  finds.sort((a, b) => a.index - b.index);

  return finds.map(find => find.word);
}
