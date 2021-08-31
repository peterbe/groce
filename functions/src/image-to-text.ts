import * as path from "path";

import * as vision from "@google-cloud/vision";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { logger } from "firebase-functions";

const client = new vision.ImageAnnotatorClient();

type FoodWord = {
  id: string;
  word: string;
  locale: string;
};

export const onFileUploadToText = functions.storage.object().onFinalize(
  async (object): Promise<void> => {
    const { contentType, name } = object;

    if (!name) {
      logger.warn(`object without a name ${object}`);
      return;
    }
    if (!name.startsWith("list-pictures")) {
      logger.info(
        `Name (${name}) doesn't start with 'list-pictures' so no image-to-text`
      );
      return;
    }
    // console.log(`KEYS: ${JSON.stringify([...Object.keys(object)])}`);
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

    const label = "Total time for allFoodWords, text, listItemTexts";
    console.time(label);
    const [allFoodWords, text, listItemTexts] = await Promise.all([
      getAllFoodWords("en-US"),
      extractText(object.bucket, name),
      getAllListItemTexts(listID)
    ]);
    console.timeEnd(label);

    const foodWords = await extractFoodWords(text, [
      ...allFoodWords.keys(),
      ...listItemTexts
    ]);

    await admin
      .firestore()
      .collection(`shoppinglists/${listID}/texts`)
      .add({
        filePath: name,
        text,
        foodWords,
        created: admin.firestore.Timestamp.fromDate(new Date())
      });

    await incrementFoodWordHitCounts(foodWords, allFoodWords);
  }
);

async function incrementFoodWordHitCounts(
  foodWords: string[],
  allFoodWords: Map<string, string>
): Promise<void> {
  const batch = admin.firestore().batch();
  let countUpdates = 0;
  foodWords.forEach(word => {
    const id = allFoodWords.get(word.toLowerCase());
    if (id) {
      const ref = admin
        .firestore()
        .collection("foodwords")
        .doc(id);
      batch.update(ref, {
        hitCount: admin.firestore.FieldValue.increment(1)
      });
      countUpdates++;
    }
  });
  await batch.commit();
  logger.info(`Updating hitCount on ${countUpdates} food words`);
}

async function extractFoodWords(
  text: string,
  searchWords: string[]
): Promise<string[]> {
  const label = "Time to extract foodwords from text";
  console.time(label);
  const foodWords = getFoodWords(text, searchWords);
  console.timeEnd(label);
  logger.info(`Food words found: ${foodWords.join(", ")}`);
  return foodWords;
}

async function getAllListItemTexts(listID: string): Promise<string[]> {
  const label = "Time to extract all list item texts";
  console.time(label);
  const snapshot = await admin
    .firestore()
    .collection(`shoppinglists/${listID}/items`)
    .get();
  const texts = snapshot.docs.map(snapshot => snapshot.data().text);
  console.timeEnd(label);
  logger.info(`Found ${texts.length} existing list item texts.`);
  return texts;
}

async function extractText(bucketName: string, name: string): Promise<string> {
  const gcsName = `gs://${bucketName}/${name}`;

  console.time("Run documentTextDetection");
  const [result] = await client.documentTextDetection(gcsName);
  const fullTextAnnotation = result.fullTextAnnotation;
  if (!fullTextAnnotation) {
    logger.warn(`Empty fullTextAnnotation from ${gcsName}`);
    // return '';
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

async function getAllFoodWords(locale = "en-US"): Promise<Map<string, string>> {
  console.time("Extract all possible food words");
  const foodWordsSnapshot = await admin
    .firestore()
    .collection("foodwords")
    .get();
  const allFoodWords: Map<string, string> = new Map();
  const localeLC = locale.toLowerCase();
  foodWordsSnapshot.forEach(snapshot => {
    const data = snapshot.data() as FoodWord;
    // NOTE that the query doesn't use a `.where("locale", "==", locale)`
    // because it's actually slower than extracting all and filtering
    // manually here. At the moment.
    // Also, some day we might want to make special treatment for
    // en-GB ~= en-US or perhaps if the locale ==='fr', we might want to
    // also include the English words that are nouns such as "Oreos".
    if (data.locale.toLowerCase() === localeLC) {
      allFoodWords.set(data.word.toLowerCase(), snapshot.id);
    }
  });
  console.timeEnd("Extract all possible food words");
  console.log(`Using ${allFoodWords.size} known sample food words`);
  return allFoodWords;
}

const escapeNeedle = (needle: string) =>
  needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Exported for the benefit of manual testing with test-get-food-words.ts
export function getFoodWords(text: string, listItems: string[]) {
  const possibleFoodWords = listItems.map(t => t.toLowerCase());

  possibleFoodWords.sort((a, b) => b.length - a.length);

  type Find = { word: string; index: number };
  const finds: Find[] = [];
  text = text.replace(/\n/g, " ").replace(/\s\s+/, " ");

  for (const word of possibleFoodWords) {
    const rex = new RegExp(`\\b${escapeNeedle(word)}\\b`, "i");
    const match = text.match(rex);
    if (!match) {
      continue;
    }
    finds.push({ word: match[0], index: match.index || 0 });
    text = text.replace(rex, " ");
  }
  // Sort by the location they were found in the text.
  finds.sort((a, b) => a.index - b.index);
  return finds.map(find => find.word);
}
