import * as path from "path";

import * as vision from "@google-cloud/vision";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { logger } from "firebase-functions";

import { FOOD_WORDS } from "./food-words";

const client = new vision.ImageAnnotatorClient();

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

    const itemsSnapshot = await admin
      .firestore()
      .collection(`shoppinglists/${listID}/items`)
      .get();
    const listItemTexts: string[] = [];
    itemsSnapshot.forEach(snapshot => {
      return snapshot.data().text;
    });

    console.log({ itemsSnapshot });

    // const bucketName = admin.storage().bucket().name;
    const bucketName = object.bucket;
    // logger.info(`Uploaded into: ${bucketName}`);
    const gcsName = `gs://${bucketName}/${name}`;

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
    // const words = cleanWords(allWords);
    const foodWords = getFoodWords(text, listItemTexts);
    logger.info(`Food words: ${foodWords.join(", ")}`);
    await admin
      .firestore()
      .collection(`shoppinglists/${listID}/texts`)
      .add({
        filePath: name,
        text,
        // words,
        foodWords,
        created: admin.firestore.Timestamp.fromDate(new Date())
      });
  }
);

const escapeNeedle = (needle: string) =>
  needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Exported for the benefit of manual testing with test-get-food-words.ts
export function getFoodWords(
  text: string,
  listItems: string[],
  language = "en"
) {
  const possibleFoodWords = [...listItems.map(t => t.toLowerCase())];
  if (language === "en") {
    possibleFoodWords.push(...FOOD_WORDS);
  } else {
    console.warn(`No known food word database for '${language}'`);
  }

  possibleFoodWords.sort((a, b) => b.length - a.length);

  type Find = { word: string; index: number };
  const finds: Find[] = [];
  const textOneLine = text.replace(/\n/g, " ").replace(/\s\s+/, " ");

  for (const word of possibleFoodWords) {
    const match = textOneLine.match(
      new RegExp(`\\b${escapeNeedle(word)}\\b`, "i")
    );
    if (!match) {
      continue;
    }
    finds.push({ word: match[0], index: match.index || 0 });
  }
  // Sort by the location they were found in the text.
  finds.sort((a, b) => a.index - b.index);
  return finds.map(find => find.word);
}
