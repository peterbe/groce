import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
// // exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello structured logs!", { structuredData: true });
//   console.log("Hello basic logs!");
//   response.send("Hello from Firebase2");
// });

export const onFeedbackSubmitted = functions.firestore
  .document("feedback/{feedbackID}")
  .onCreate((snapshot, context) => {
    const data = snapshot.data();
    console.log(
      `Feedback created: feedbackID=${
        context.params.feedbackID
      } data=${JSON.stringify(data)}`
    );
    // functions.logger.info(`Feedback created. Snapshot: ${JSON.stringify(snapshot)}`);
    // functions.logger.info(`Feedback created. Context: ${JSON.stringify(context)}`);

    return Promise.resolve("Nothing updated.");
  });

interface BriefItem {
  text: string;
  description: string;
  done: boolean;
  added: Date;
}
export const onShoppinglistItemWrite = functions.firestore
  .document("shoppinglists/{listID}/items/{itemID}")
  .onWrite((change, context) => {
    // console.log(
    //   `ITEM write: listID=${context.params.listID} itemID=${
    //     context.params.itemID
    //   }`
    // );
    // const data = change.after.data();
    // console.log(`ITEM WRITE data: ${JSON.stringify(data)}`);
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
        // console.log(`Wrote to shopping list: ${data.name}`);
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
            // console.log(`ITEMS: ${JSON.stringify(items)}`);
            const recentItems = items.slice(0, 10).map(item => {
              return {
                text: item.text,
                description: item.description,
                done: item.done
              };
            });
            return admin
              .firestore()
              .collection("shoppinglists")
              .doc(context.params.listID)
              .update({
                recent_items: recentItems
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
    // return Promise.resolve("Nothing updated.");
  });

export const onInviteAccept = functions.firestore
  .document("shoppinglists/{listID}/invitations/{invitationID}")
  .onUpdate((change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    const acceptedBefore = new Set(previousValue.accepted);
    const acceptedAfter = new Set(newValue.accepted);
    const addedUID = [...acceptedBefore].filter(x => !acceptedAfter.has(x));
    const removedUID = [...acceptedAfter].filter(x => !acceptedBefore.has(x));

    console.log(`Invite: addedUID=${addedUID} removedUID=${removedUID}}`);
    functions.logger.info(
      `addedUID: ${JSON.stringify(addedUID)}  removedUID: ${JSON.stringify(
        removedUID
      )}`
    );
    const listID = context.params.listID;

    for (const uid of addedUID) {
      return admin
        .firestore()
        .collection("shoppinglists")
        .doc(listID)
        .update({
          owners: admin.firestore.FieldValue.arrayUnion(uid)
        })
        .then(() => {
          functions.logger.info(`User ${uid} added to ${listID}`);
        })
        .catch(error => {
          functions.logger.error(error);
          return error;
        });
    }
    for (const uid of removedUID) {
      return admin
        .firestore()
        .collection("shoppinglists")
        .doc(listID)
        .update({
          owners: admin.firestore.FieldValue.arrayRemove(uid)
        })
        .then(() => {
          functions.logger.info(`User ${uid} removed from ${listID}`);
        })
        .catch(error => {
          functions.logger.error(error);
        });
    }
    return Promise.resolve("Nothing updated.");
  });
