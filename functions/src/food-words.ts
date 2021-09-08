import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

type FoodWord = {
  id: string;
  word: string;
  locale: string;
};

type FoodWordMap = Map<string, string>;
type LocaleFoodWordMap = Map<string, FoodWordMap>;

// CURRENTLY COMMENTED OUT!
export const onFoodWordUpdateMaps = functions.firestore
  .document("foodwords/{foodWordID}")
  .onWrite(async change => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    const locale = previousValue
      ? previousValue.locale
      : newValue
        ? newValue.locale
        : "en-US";

    if (previousValue && newValue) {
      logger.info(`Changed value: ${newValue.word} (${newValue.locale})`);
    } else if (previousValue) {
      logger.info(
        `Previous value: ${previousValue.word} (${previousValue.locale})`
      );
    } else if (newValue) {
      logger.info(`New value: ${newValue.word} (${newValue.locale})`);
    }

    const allFoodWordsMap = await getAllFoodWords();
    logger.info(`There are ${allFoodWordsMap.size} locales`);
    for (const [locale, map] of allFoodWordsMap) {
      logger.info(`Words in ${locale}: ${map.size}`);
    }
    logger.info(`locale=${locale}`);

    const wordsMap = allFoodWordsMap.get(locale);
    if (wordsMap) {
      const wordsObj: {
        [word: string]: string;
      } = {};
      let countWords = 0;
      for (const [word, id] of wordsMap.entries()) {
        wordsObj[word] = id;
        countWords++;
      }
      logger.info(
        `Size as a JSON string: ${
          JSON.stringify(wordsObj).length
        } (countWords=${countWords})`
      );
      await admin
        .firestore()
        .collection("normalizedfoodwords")
        .doc(locale)
        .set({
          words: wordsObj
        });
    }
  });

async function getAllFoodWords(): Promise<LocaleFoodWordMap> {
  const snapshot = await admin
    .firestore()
    .collection("foodwords")
    .get();
  const allFoodWords: Map<string, FoodWordMap> = new Map();
  snapshot.forEach(snapshot => {
    const { id } = snapshot;
    const { word, locale } = snapshot.data() as FoodWord;
    if (!allFoodWords.has(locale)) {
      allFoodWords.set(locale, new Map());
    }
    const map = allFoodWords.get(locale);
    if (map) {
      map.set(word, id);
    }
  });
  return allFoodWords;
}
