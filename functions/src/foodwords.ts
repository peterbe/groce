import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import { FOOD_WORDS } from "./sample-food-words";

export const loadSampleFoodWords = functions.https.onRequest(
  async (req, res) => {
    if (!process.env.FUNCTIONS_EMULATOR) {
      res.status(412).send("Must be in emulator mode");
      return;
    }
    const snapshot = await admin.firestore().collection("foodwords").get();
    const existingWords: Map<string, Set<string>> = new Map();
    let totalWords = 0;
    snapshot.forEach((doc) => {
      const { locale, word } = doc.data();
      totalWords++;
      if (!existingWords.has(locale)) {
        existingWords.set(locale, new Set());
      }
      existingWords.get(locale)?.add(word);
    });

    res.setHeader("access-control-allow-origin", "*");

    if (req.method === "POST") {
      const firestore = admin.firestore();
      let batch = firestore.batch();
      let counter = 0;
      let totalCounter = 0;
      const locale = "en-US";
      for (const info of FOOD_WORDS) {
        const { word } = info;
        if (existingWords.has(locale) && existingWords.get(locale)?.has(word)) {
          continue;
        }
        counter++;
        const docRef = firestore.collection("foodwords").doc();
        batch.set(docRef, {
          word,
          locale,
          hitCount: 0,
          // aliasTo: ''
        });
        counter++;
        if (counter >= 500) {
          console.log(`Committing batch of ${counter}`);
          await batch.commit();
          totalCounter += counter;
          counter = 0;
          batch = firestore.batch();
        }
      }

      if (counter) {
        console.log(`Committing batch of ${counter}`);
        await batch.commit();
        totalCounter += counter;
      }
      console.log(`Committed total of ${totalCounter}`);
      res.status(201).json({ totalCounter });
    } else {
      console.log(
        `There are ${totalWords} foodwords (${FOOD_WORDS.length} samples)`
      );

      res.status(200).json({ totalWords, samples: FOOD_WORDS.length });
    }
  }
);
