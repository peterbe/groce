import * as path from "path";

import * as vision from "@google-cloud/vision";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { logger } from "firebase-functions";

const client = new vision.ImageAnnotatorClient();

type FoodWord = {
  id: string;
  word: string;
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
    // console.log(JSON.stringify(object));
    console.log(Object.keys(object));
    const fileName = path.basename(name);
    const listID = fileName.split("-")[0];
    if (!listID) {
      logger.warn(
        `First part of the name (${name}) doesn't appear to be a list ID`
      );
      return;
    }

    // logger.info(`Uploaded file: ${name}, ${contentType}`);

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

    console.time("Extract all user's food words");
    const itemsSnapshot = await admin
      .firestore()
      .collection(`shoppinglists/${listID}/items`)
      .get();
    const listItemTexts: string[] = [];
    itemsSnapshot.forEach(snapshot => {
      return snapshot.data().text;
    });
    console.timeEnd("Extract all user's food words");
    logger.info(
      `Using ${listItemTexts.length} existing grocery words from list owner.`
    );

    console.time("Extract all possible food words");
    const foodWordsSnapshot = await admin
      .firestore()
      .collection("foodwords")
      .where("locale", "==", "en-US")
      .get();
    const allFoodWords: Map<string, string> = new Map();
    const allFoodWordsLC: Map<string, string> = new Map();
    foodWordsSnapshot.forEach(snapshot => {
      const data = snapshot.data() as FoodWord;
      allFoodWords.set(data.word, snapshot.id);
      allFoodWordsLC.set(data.word.toLowerCase(), snapshot.id);
    });
    console.timeEnd("Extract all possible food words");
    console.log(`Using ${allFoodWords.size} known sample food words`);

    const bucketName = object.bucket;
    const gcsName = `gs://${bucketName}/${name}`;

    console.time("Run documentTextDetection");
    const [result] = await client.documentTextDetection(gcsName);
    const fullTextAnnotation = result.fullTextAnnotation;
    if (!fullTextAnnotation) {
      logger.warn(`No fullTextAnnotation from ${gcsName}`);
      return;
    }
    const text = fullTextAnnotation.text || "";
    const allWords: string[] = [];
    // console.log(`Full text: ${fullTextAnnotation.text}`);
    (fullTextAnnotation.pages || []).forEach(page => {
      (page.blocks || []).forEach(block => {
        // console.log(`Block confidence: ${block.confidence}`);
        (block.paragraphs || []).forEach(paragraph => {
          // console.log(`Paragraph confidence: ${paragraph.confidence}`);
          (paragraph.words || []).forEach(word => {
            const wordText = (word.symbols || []).map(s => s.text).join("");
            // console.log(`Word text: ${wordText}`);
            allWords.push(wordText);
            // console.log(`Word confidence: ${word.confidence}`);
          });
        });
      });
    });
    console.timeEnd("Run documentTextDetection");

    const foodWords = getFoodWords(text, [
      ...allFoodWords.keys(),
      ...listItemTexts
    ]);
    logger.info(`Food words found: ${foodWords.join(", ")}`);
    console.time("Store found words");
    await admin
      .firestore()
      .collection(`shoppinglists/${listID}/texts`)
      .add({
        filePath: name,
        text,
        foodWords,
        created: admin.firestore.Timestamp.fromDate(new Date())
      });
    console.timeEnd("Store found words");

    console.time("Increment hitCounts");
    const batch = admin.firestore().batch();
    let countUpdates = 0;
    foodWords.forEach(word => {
      const id = allFoodWordsLC.get(word.toLowerCase());
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
    logger.info(`Updating hitCount on ${countUpdates} food words`);
    await batch.commit();
    console.timeEnd("Increment hitCounts");
  }
);

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
