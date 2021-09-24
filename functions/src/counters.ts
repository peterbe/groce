import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const onShoppinglistItemUpdateCounter = functions.firestore
  .document("shoppinglists/{listID}/items/{itemID}")
  .onUpdate(async (change) => {
    const newValue = change.after.data();
    // ...or the previous value before this update
    const previousValue = change.before.data();
    if (!previousValue.done && newValue.done) {
      const now = new Date();
      const [year, month, day] = now.toISOString().split("T")[0].split("-");

      const docRef = admin.firestore().collection("counters").doc("itemsDone");

      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) {
        // Very first time!
        await docRef.set({
          ever: 1,
          [year]: 1,
          [`${year}-${month}`]: 1,
          [`${year}-${month}-${day}`]: 1,
        });
      } else {
        await docRef.update({
          ever: admin.firestore.FieldValue.increment(1),
          [year]: admin.firestore.FieldValue.increment(1),
          [`${year}-${month}`]: admin.firestore.FieldValue.increment(1),
          [`${year}-${month}-${day}`]: admin.firestore.FieldValue.increment(1),
        });
      }
    }
  });

export const onShoppinglistsCreateCounter = functions.firestore
  .document("shoppinglists/{listID}")
  .onCreate(async () => {
    const now = new Date();
    const [year, month, day] = now.toISOString().split("T")[0].split("-");

    const docRef = admin.firestore().collection("counters").doc("listsCreated");

    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      // Very first time!
      return docRef.set({
        ever: 1,
        [year]: 1,
        [`${year}-${month}`]: 1,
        [`${year}-${month}-${day}`]: 1,
      });
    }
    return docRef.update({
      ever: admin.firestore.FieldValue.increment(1),
      [year]: admin.firestore.FieldValue.increment(1),
      [`${year}-${month}`]: admin.firestore.FieldValue.increment(1),
      [`${year}-${month}-${day}`]: admin.firestore.FieldValue.increment(1),
    });
  });
