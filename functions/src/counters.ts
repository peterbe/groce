import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const onShoppinglistItemUpdateCounter = functions.firestore
  .document("shoppinglists/{listID}/items/{itemID}")
  .onUpdate((change, context) => {
    const newValue = change.after.data();
    // ...or the previous value before this update
    const previousValue = change.before.data();
    if (!previousValue.done && newValue.done) {
      const now = new Date();
      const [year, month, day] = now
        .toISOString()
        .split("T")[0]
        .split("-");
      return admin
        .firestore()
        .collection("counters")
        .doc("itemsDone")
        .update({
          ever: admin.firestore.FieldValue.increment(1),
          [year]: admin.firestore.FieldValue.increment(1),
          [`${year}-${month}`]: admin.firestore.FieldValue.increment(1),
          [`${year}-${month}-${day}`]: admin.firestore.FieldValue.increment(1)
        });
    } else {
      return Promise.resolve();
    }
  });

export const onShoppinglistsCreateCounter = functions.firestore
  .document("shoppinglists/{listID}")
  .onCreate(async () => {
    const now = new Date();
    const [year, month, day] = now
      .toISOString()
      .split("T")[0]
      .split("-");
    return admin
      .firestore()
      .collection("counters")
      .doc("listsCreated")
      .update({
        ever: admin.firestore.FieldValue.increment(1),
        [year]: admin.firestore.FieldValue.increment(1),
        [`${year}-${month}`]: admin.firestore.FieldValue.increment(1),
        [`${year}-${month}-${day}`]: admin.firestore.FieldValue.increment(1)
      });
  });
