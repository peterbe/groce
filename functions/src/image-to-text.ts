import * as path from "path";

import * as vision from "@google-cloud/vision";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import { wrappedLogError } from "./rollbar-logger";
import { getFoodWords } from "./extract-food-words";
import { MOCK_TEXTS } from "./mock-texts";
import { FOOD_WORDS } from "./sample-food-words";

const { logger } = functions;

type FoodWord = {
  id: string;
  word: string;
  aliasTo?: string;
  locale: string;
};
type FoodWordInfo = {
  id: string;
  aliasTo: string;
};
type FoodWordMap = Map<string, FoodWordInfo>;
type FoodWordOption = {
  word: string;
  ignore: boolean;
  alias: string | null;
};

export const onFileUploadToText = functions
  .runWith({
    // According to https://console.cloud.google.com/functions/list?project=thatsgroce
    // the default is 256MB.
    // Going to increase it a bit since it's moderately compute'y.
    memory: "512MB",
  })
  .storage.object()
  .onFinalize(
    wrappedLogError(async (object): Promise<void> => {
      const { contentType, name } = object;

      if (!name) {
        logger.warn(`object without a name ${object}`);
        return;
      }
      if (!name.startsWith("list-pictures")) {
        logger.debug(
          `Name (${name}) doesn't start with 'list-pictures' so no image-to-text`
        );
        return;
      }
      const fileName = path.basename(name);
      const listID = fileName.split("-")[0];
      if (!listID) {
        logger.warn(
          `First part of the name (${name}) doesn't appear to be a list ID`
        );
        return;
      }

      if (!["image/jpeg", "image/png"].includes(contentType || "")) {
        // Technically many more formats are supported but we can't make
        // thumbnails out of them. Perhaps that's a mistake.
        // https://cloud.google.com/vision/docs/supported-files#file_formats
        logger.warn(
          `${contentType} content type is not supported for image-to-text`
        );
        return;
      }

      const doc = await admin
        .firestore()
        .collection("shoppinglists")
        .doc(listID)
        .get();

      if (!doc.exists) {
        logger.error(`Shopping list (${listID}) does not exist`);
        return;
      }

      const list = doc.data();
      const DEFAULT_LOCALE = "en-US";
      const locale = (list && list.locale) || DEFAULT_LOCALE;

      const label = "Total time for allFoodWords, text, listItemTexts";
      console.time(label);
      const [allFoodWords, text, listItemTexts, listWordOptions] =
        await Promise.all([
          getAllFoodWords(locale),
          extractText(object.bucket, name),
          getAllListItemTexts(listID),
          getListWordOptions(listID),
        ]);
      console.timeEnd(label);

      const aliases: Map<string, string> = new Map();
      const searchWords: string[] = [];
      for (const [word, info] of allFoodWords) {
        searchWords.push(word);
        if (info.aliasTo) {
          aliases.set(word, info.aliasTo);
        } else {
          const wordNormalized = word
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          // E.g. `Crème Fraîche` becomes `Creme Fraiche`
          if (wordNormalized !== word) {
            searchWords.push(wordNormalized);
            aliases.set(wordNormalized, word);
          }
        }
      }
      // Now add all the list specific words
      for (const word of listItemTexts) {
        searchWords.push(word);
      }
      const ignoreWords: string[] = [];
      for (const option of listWordOptions) {
        if (option.alias) {
          searchWords.push(option.word);
          aliases.set(option.word, option.alias);
        } else if (option.ignore) {
          ignoreWords.push(option.word);
        }
      }

      const extractLabel = "Time to extract foodwords from text";
      console.time(extractLabel);
      const foodWords = getFoodWords(text, searchWords, aliases, ignoreWords);
      console.timeEnd(extractLabel);

      await admin
        .firestore()
        .collection(`shoppinglists/${listID}/texts`)
        .add({
          filePath: name,
          text,
          foodWords,
          created: admin.firestore.Timestamp.fromDate(new Date()),
        });

      if (!process.env.FUNCTIONS_EMULATOR) {
        await incrementFoodWordHitCounts(foodWords, allFoodWords);
      }

      // This forces the the global cache to always be up-to-date.
      await getAllFoodWords(locale, true);
    })
  );

async function incrementFoodWordHitCounts(
  foodWords: string[],
  allFoodWords: FoodWordMap
): Promise<void> {
  const batch = admin.firestore().batch();
  let countUpdates = 0;
  foodWords.forEach((word) => {
    const info = allFoodWords.get(word.toLowerCase());
    if (info) {
      const { id } = info;
      const ref = admin.firestore().collection("foodwords").doc(id);
      batch.update(ref, {
        hitCount: admin.firestore.FieldValue.increment(1),
      });
      countUpdates++;
    }
  });
  await batch.commit();
  logger.debug(`Updating hitCount on ${countUpdates} food words`);
}

async function getAllListItemTexts(listID: string): Promise<string[]> {
  const label = "Time to extract all list item texts";
  console.time(label);
  const snapshot = await admin
    .firestore()
    .collection(`shoppinglists/${listID}/items`)
    .get();
  const texts = snapshot.docs.map((s) => s.data().text);
  console.timeEnd(label);
  logger.info(`Found ${texts.length} existing list item texts.`);
  return texts;
}

async function getListWordOptions(listID: string): Promise<FoodWordOption[]> {
  const label = "Time to extract all list food word options";
  console.time(label);
  const snapshot = await admin
    .firestore()
    .collection(`shoppinglists/${listID}/wordoptions`)
    .get();
  const foodWordOptions: FoodWordOption[] = [];
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    foodWordOptions.push({
      word: data.word,
      ignore: data.ignore || false,
      alias: data.alias || null,
    });
  });
  console.timeEnd(label);
  logger.info(`Found ${foodWordOptions.length} food word options.`);
  return foodWordOptions;
}

async function extractText(bucketName: string, name: string): Promise<string> {
  if (process.env.FUNCTIONS_EMULATOR) {
    return mockExtractText();
  }

  const gcsName = `gs://${bucketName}/${name}`;
  const client = new vision.ImageAnnotatorClient();

  console.time("Run documentTextDetection");
  const [result] = await client.documentTextDetection(gcsName);
  const fullTextAnnotation = result.fullTextAnnotation;
  if (!fullTextAnnotation) {
    logger.warn(`Empty fullTextAnnotation from ${gcsName}`);
  }
  const text = (fullTextAnnotation && fullTextAnnotation.text) || "";
  // const allWords: string[] = [];
  // // console.log(`Full text: ${fullTextAnnotation.text}`);
  // (fullTextAnnotation.pages || []).forEach(page => {
  //   (page.blocks || []).forEach(block => {
  //     // console.log(`Block confidence: ${block.confidence}`);
  //     (block.paragraphs || []).forEach(paragraph => {
  //       // console.log(`Paragraph confidence: ${paragraph.confidence}`);
  //       (paragraph.words || []).forEach(word => {
  //         const wordText = (word.symbols || []).map(s => s.text).join("");
  //         // console.log(`Word text: ${wordText}`);
  //         allWords.push(wordText);
  //         // console.log(`Word confidence: ${word.confidence}`);
  //       });
  //     });
  //   });
  // });
  console.timeEnd("Run documentTextDetection");
  return text;
}

function mockExtractText(): Promise<string> {
  return new Promise((resolve) => {
    const prefix = `MOCK TEXT! ${new Date()}\n`;
    const randomText =
      MOCK_TEXTS[Math.floor(Math.random() * MOCK_TEXTS.length)];
    resolve(prefix + randomText);
  });
}

const globalCacheAllFoodWords: Map<string, FoodWordMap> = new Map();

async function getAllFoodWords(
  locale = "en-US",
  refreshCache = false
): Promise<FoodWordMap> {
  // Relying on a global cache in Cloud Functions isn't great, but if it
  // works just a little sometimes, it can be a little help.

  if (!refreshCache) {
    const fromCache = globalCacheAllFoodWords.get(locale);
    if (fromCache) {
      logger.info(`Cache HIT on getAllFoodWords(${locale})!`);
      return fromCache;
    }
    logger.info(`Cache MISS on getAllFoodWords(${locale})!`);
  }

  if (process.env.FUNCTIONS_EMULATOR) {
    return mockAllFoodwords();
  }

  const label = `Time to download ALL food words (refreshCache=${JSON.stringify(
    refreshCache
  )})`;
  console.time(label);
  const foodWordsSnapshot = await admin
    .firestore()
    .collection("foodwords")
    .get();
  const allFoodWords: FoodWordMap = new Map();
  const localeLC = locale.toLowerCase();
  foodWordsSnapshot.forEach((snapshot) => {
    const data = snapshot.data() as FoodWord;
    // NOTE that the query doesn't use a `.where("locale", "==", locale)`
    // because it's actually slower than extracting all and filtering
    // manually here. At the moment.
    // Also, some day we might want to make special treatment for
    // en-GB ~= en-US or perhaps if the locale ==='fr', we might want to
    // also include the English words that are nouns such as "Oreos".
    if (data.locale.toLowerCase() === localeLC) {
      allFoodWords.set(data.word.toLowerCase(), {
        id: snapshot.id,
        aliasTo: data.aliasTo || "",
      });
    }
  });
  console.timeEnd(label);
  console.log(`Using ${allFoodWords.size} known sample food words`);
  globalCacheAllFoodWords.set(locale, allFoodWords);
  return allFoodWords;
}

function mockAllFoodwords(): Promise<FoodWordMap> {
  return new Promise((resolve) => {
    const allFoodWords: FoodWordMap = new Map();
    FOOD_WORDS.forEach(({ word, aliasTo }, i) => {
      allFoodWords.set(word.toLowerCase(), {
        id: `fakeFoodWord-${i + 1}`,
        aliasTo: aliasTo || "",
      });
    });
    resolve(allFoodWords);
  });
}
