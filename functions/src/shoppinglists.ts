import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface BriefItem {
  text: string;
  description: string;
  done: boolean;
  quantity?: number;
  added: Date;
}

export const onShoppinglistItemWrite = functions.firestore
  .document("shoppinglists/{listID}/items/{itemID}")
  .onWrite((change, context) => {
    // Number of items to put into the `recent_items` array.
    // It's ideal if this matches the business logic of displaying.
    const CUTOFF_RECENT_ITEMS = 5;

    return admin
      .firestore()
      .collection("shoppinglists")
      .doc(context.params.listID)
      .get()
      .then(doc => {
        if (!doc.exists) {
          return Promise.resolve("Shopping list does not exist :(");
        }
        const data = doc.data();
        if (!data) {
          return Promise.resolve("Shopping list contains no data :(");
        }
        const recentItemsBefore = data.recent_items;
        const activeItemsCountBefore = data.active_items_count;

        // Get a summary of the top 10 most recently added items
        return admin
          .firestore()
          .collection("shoppinglists")
          .doc(context.params.listID)
          .collection("items")
          .where("removed", "==", false)
          .get()
          .then(snapshot => {
            const items: BriefItem[] = [];
            snapshot.forEach(doc => {
              // doc.data() is never undefined for query doc snapshots
              // console.log("ITEM...", doc.id, " => ", doc.data());
              const data = doc.data();
              items.push({
                text: data.text,
                description: data.description,
                added: data.added[0].toDate(),
                quantity: data.quantity || 0,
                done: data.done
              });
            });
            items.sort((a, b) => {
              if (a.done === b.done) {
                return b.added.getTime() - a.added.getTime();
              } else if (a.done) {
                return 1;
              } else {
                return -1;
              }
            });

            const recentItems = items
              .slice(0, CUTOFF_RECENT_ITEMS)
              .map(item => {
                return {
                  text: item.text,
                  description: item.description,
                  quantity: item.quantity,
                  done: item.done
                };
              });

            if (
              items.length === activeItemsCountBefore &&
              JSON.stringify(recentItemsBefore) === JSON.stringify(recentItems)
            ) {
              console.log(
                "The recent_items and active_items_count has not changed."
              );
              return Promise.resolve("No need to update");
            }

            return admin
              .firestore()
              .collection("shoppinglists")
              .doc(context.params.listID)
              .update({
                recent_items: recentItems,
                active_items_count: items.length,
                modified: admin.firestore.Timestamp.fromDate(new Date())
              })
              .then(() => {
                return Promise.resolve(
                  `Wrote recent_items: ${JSON.stringify(recentItems)}`
                );
              })
              .catch(error => {
                console.error("Error trying to write recent_items", error);
                return Promise.reject(error);
              });
          })
          .catch(error => {
            console.error("Error getting items snapshot", error);
            return Promise.reject(error);
          });
      })
      .catch(error => {
        console.log("Error getting shopping list:", error);
        return Promise.reject(error);
      });
  });

interface OwnerMetadata {
  email?: string;
  displayName?: string;
  photoURL?: string;
}
export const onShoppinglistWriteOwnersMetadata = functions.firestore
  .document("shoppinglists/{listID}")
  .onWrite(async (snapshot, context) => {
    const doc = await admin
      .firestore()
      .collection("shoppinglists")
      .doc(context.params.listID)
      .get();

    if (!doc.exists) {
      return console.error(`No shopping list with ID ${context.params.listID}`);
    }
    const data = doc.data();
    if (!data) {
      return console.error(
        `Shopping list with ID ${context.params.listID} contains no data`
      );
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
      owners.map(uid => admin.auth().getUser(uid))
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
      console.log(
        `SAVE new ownersMetadata := ${JSON.stringify(ownersMetadata)}`
      );
      admin
        .firestore()
        .collection("shoppinglists")
        .doc(context.params.listID)
        .update({
          ownersMetadata
        });
    }
  });
