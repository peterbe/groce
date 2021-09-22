import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Timestamp } from "firebase/firestore";

import { wrappedLogError } from "./rollbar-logger";

type Owner = {
  email?: string;
  displayName?: string;
  photoURL?: string;
};

type List = {
  name: string;
  added?: Timestamp;
  modified: Timestamp;
  ownersMetadata: {
    [uid: string]: Owner;
  };
  active_items_count?: number;
};

export const scheduledCleanupShoppinglists = functions.pubsub
  .schedule("every 24 hours")
  // .schedule("every 2 minutes")
  .onRun(wrappedLogError(cleanupShoppinglists));

// export const triggerCleanupShoppinglists = functions.https.onRequest(
//   async (req, res) => {
//     const deleteListIDs = await cleanupShoppinglists();
//     res.status(201).send(`deleteListIDs = ${JSON.stringify(deleteListIDs)}\n`);
//   }
// );

async function cleanupShoppinglists() {
  const firestore = admin.firestore();
  const querySnapshot = await firestore
    .collection("shoppinglists")
    .orderBy("modified")
    .limit(100)
    .get();

  const deleteListIDs: string[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data() as List;
    const age = new Date().getTime() - data.modified.toDate().getTime();
    const ageDays = age / 1000 / 60 / 60 / 24;
    if (ageDays < 90) {
      // don't even bother! Exit early from the rest of the stuff.
      return;
    }
    const recentItems = data.active_items_count || 0;
    const displayNames: string[] = [];
    if (data.ownersMetadata) {
      for (const owner of Object.values(data.ownersMetadata)) {
        if (owner.displayName) {
          displayNames.push(owner.displayName);
        }
      }
    }

    console.log(
      `ID:${doc.id} NAME: ${data.name} AGE(days): ${ageDays.toFixed(
        0
      )} #RECENT_ITEMS: ${recentItems} DISPLAY_NAMES: ${
        displayNames.length > 0 ? displayNames.join(", ") : "none!"
      }`
    );
    if (shouldDelete(ageDays, displayNames, recentItems)) {
      deleteListIDs.push(doc.id);
    }
  });

  if (deleteListIDs.length === 0) {
    functions.logger.info("No shoppinglists to delete");
  } else {
    const batch = firestore.batch();
    for (const id of deleteListIDs) {
      batch.delete(firestore.collection("shoppinglists").doc(id));
    }
    await batch.commit();
    functions.logger.info(`Deleted ${deleteListIDs.length} shopping lists.`);
  }

  return deleteListIDs;
}

function shouldDelete(
  ageDays: number,
  displayNames: string[],
  recentItems: number
) {
  // Remember 'ageDays' reflects when it was last modified. Adding an
  // item to a list will increment it's last modified date.

  if (ageDays > 365) {
    // Really old ones
    if (displayNames.length === 0) {
      // Old and by an anonymous
      return true;
    }
  } else if (ageDays > 90) {
    if (displayNames.length === 0 && recentItems === 0) {
      // Old and by an anonymous and no recent items
      return true;
    }
  }

  // The default/fallback
  return false;
}
