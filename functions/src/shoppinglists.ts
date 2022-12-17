import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { wrappedLogError } from "./rollbar-logger";

interface BriefItem {
  text: string;
  description: string;
  done: boolean;
  quantity?: number;
  added: Date;
}

export const onShoppinglistItemWrite = functions.firestore
  .document("shoppinglists/{listID}/items/{itemID}")
  .onWrite(
    wrappedLogError(async (change, context): Promise<void> => {
      // Number of items to put into the `recent_items` array.
      // It's ideal if this matches the business logic of displaying.
      const CUTOFF_RECENT_ITEMS = 5;

      const { listID } = context.params;
      const doc = await admin
        .firestore()
        .collection("shoppinglists")
        .doc(listID)
        .get();

      if (!doc.exists) {
        functions.logger.warn(`Shopping list ${listID} does not exist`);
        return;
      }
      const data = doc.data();
      if (!data) {
        functions.logger.warn(
          `Shopping list ${listID} has no data (deletion?)`
        );
        return;
      }
      const recentItemsBefore = data.recent_items;
      const activeItemsCountBefore = data.active_items_count;

      // Get a summary of the top 10 most recently added items
      const snapshot = await admin
        .firestore()
        .collection("shoppinglists")
        .doc(context.params.listID)
        .collection("items")
        .where("removed", "==", false)
        .get();

      const items: BriefItem[] = [];
      snapshot.forEach((itemDoc) => {
        // doc.data() is never undefined for query doc snapshots
        const itemData = itemDoc.data();
        items.push({
          text: itemData.text,
          description: itemData.description,
          added: itemData.added[0].toDate(),
          quantity: itemData.quantity || 0,
          done: itemData.done,
        });
      });
      items.sort((a, b) => {
        if (a.done === b.done) {
          return b.added.getTime() - a.added.getTime();
        } else if (a.done) {
          return 1;
        }
        return -1;
      });

      const recentItems = items.slice(0, CUTOFF_RECENT_ITEMS).map((item) => {
        return {
          text: item.text,
          description: item.description,
          quantity: item.quantity,
          done: item.done,
        };
      });

      if (
        items.length === activeItemsCountBefore &&
        JSON.stringify(recentItemsBefore) === JSON.stringify(recentItems)
      ) {
        functions.logger.info(
          "The recent_items and active_items_count has not changed."
        );
        return;
      }

      await admin
        .firestore()
        .collection("shoppinglists")
        .doc(context.params.listID)
        .update({
          recent_items: recentItems,
          active_items_count: items.length,
          modified: new Date(),
        });
    })
  );

interface OwnerMetadata {
  email?: string;
  displayName?: string;
  photoURL?: string;
}
export const onShoppinglistWriteOwnersMetadata = functions.firestore
  .document("shoppinglists/{listID}")
  .onWrite(
    wrappedLogError(async (change, context): Promise<void> => {
      const { listID } = context.params;

      // If the change is that the shopping list was deleted, bail.
      if (!change.after.data()) {
        functions.logger.warn(
          "Shoppinglist deleted. Not going to update owners metadata"
        );
        return;
      }

      const doc = await admin
        .firestore()
        .collection("shoppinglists")
        .doc(listID)
        .get();

      if (!doc.exists) {
        console.error(`No shopping list with ID ${listID}`);
        return;
      }
      const data = doc.data();
      if (!data) {
        console.error(`Shopping list with ID ${listID} contains no data`);
        return;
      }
      const owners: string[] = data.owners;
      const ownersMetadataBefore: Record<string, OwnerMetadata> =
        data.ownersBefore || {};
      const ownersMetadata: Record<string, OwnerMetadata> = {};
      const getters = [];
      for (const uid of owners) {
        getters.push(admin.auth().getUser(uid));
      }
      const users = await Promise.all(
        owners.map((uid) => admin.auth().getUser(uid))
      );
      for (const user of users) {
        const owner: OwnerMetadata = {};
        if (user.email) {
          owner.email = user.email;
        }
        if (user.displayName) {
          owner.displayName = user.displayName;
        }
        if (user.photoURL) {
          owner.photoURL = user.photoURL;
        }
        ownersMetadata[user.uid] = owner;
      }
      if (
        JSON.stringify(ownersMetadata) !== JSON.stringify(ownersMetadataBefore)
      ) {
        await admin.firestore().collection("shoppinglists").doc(listID).update({
          ownersMetadata,
        });
      }
    })
  );

export const onShoppinglistDelete = functions.firestore
  .document("shoppinglists/{listID}")
  .onDelete(async (snapshot, context) => {
    const { listID } = context.params;

    const subCollectionNames = [
      "items",
      "invitations",
      "pictures",
      "texts",
      "wordoptions",
    ];
    const counts: Map<string, number> = new Map();
    const countResults = await Promise.all(
      subCollectionNames.map((name) => {
        return deleteAllByShoppinglistSubcollection(listID, name);
      })
    );
    countResults.forEach((count, i) => {
      counts.set(subCollectionNames[i], count);
    });
    if (counts.size > 0) {
      let msg = "After deleting shopping list also deleted: ";
      msg += [...counts.entries()]
        .map(([name, count]) => {
          return `${count} ${name}`;
        })
        .join(", ");
      functions.logger.info(msg);
    } else {
      functions.logger.info(
        `No subcollections to delete when deleting ${listID}`
      );
    }
  });

async function deleteAllByShoppinglistSubcollection(
  listID: string,
  subCollectionName: string
): Promise<number> {
  const batch = admin.firestore().batch();
  const itemsSnapshot = await admin
    .firestore()
    .collection("shoppinglists")
    .doc(listID)
    .collection(subCollectionName)
    .get();
  let count = 0;
  itemsSnapshot.forEach((itemSnapshot) => {
    batch.delete(
      admin
        .firestore()
        .collection(`shoppinglists/${listID}/${subCollectionName}`)
        .doc(itemSnapshot.id)
    );
    count++;
  });
  await batch.commit();
  return count;
}
