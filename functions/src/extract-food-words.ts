const escapeNeedle = (needle: string) =>
  needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function getFoodWords(
  rawText: string,
  listItems: string[],
  aliases: Map<string, string>,
  ignoreWords: string[]
) {
  const possibleFoodWords = [...new Set(listItems.map((t) => t.toLowerCase()))];

  possibleFoodWords.sort((a, b) => b.length - a.length);

  type Find = { word: string; index: number };
  const finds: Find[] = [];
  let text = rawText.replace(/\n/g, " ").replace(/\s\s+/, " ");

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

  const ignoresLC = new Set(ignoreWords.map((word) => word.toLowerCase()));
  const aliasesLC: Map<string, string> = new Map();
  for (const [key, value] of aliases.entries()) {
    aliasesLC.set(key.toLowerCase(), value);
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
    // Note, the 'index' is also important because you can't use the
    // regex `match.index` because the `text` that the regex runs on
    // is constantly changing because when words are found, they are
    // removed from the text. So, us the original `indexOf` position
    // as the memory of exact order.
    const index = textLC.indexOf(word);
    if (index === -1) {
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
    const alias = aliasesLC.get(found.toLowerCase());

    finds.push({
      word: alias || found,
      index,
    });
    text = text.replace(rex, " ");
  }
  // Sort by the location they were found in the text.
  finds.sort((a, b) => a.index - b.index);

  return finds.map((find) => find.word);
}
