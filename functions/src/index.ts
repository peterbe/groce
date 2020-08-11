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

export const onInviteAccept = functions.firestore
  .document(
    "shoppinglists/{listID}/invitations/{invitationID}"
  )
  .onUpdate((change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    const acceptedBefore = new Set(previousValue.accepted);
    const acceptedAfter = new Set(newValue.accepted);
    const addedUID = [...acceptedBefore].filter((x) => !acceptedAfter.has(x));
    const removedUID = [...acceptedAfter].filter((x) => !acceptedBefore.has(x));

    // functions.logger.info(`addedUID: ${JSON.stringify(addedUID)}  removedUID: ${JSON.stringify(removedUID)}`);
    const listID = context.params.listID;

    for (const uid of addedUID) {
      return admin.firestore().collection('shoppinglists').doc(listID)
        .update({
          owners: admin.firestore.FieldValue.arrayUnion(uid),
        })
        .then(() => {
          functions.logger.info(`User ${uid} added to ${listID}`);
        })
        .catch((error) => {
          functions.logger.error(error)
        });
    }
    for (const uid of removedUID) {
      return admin.firestore().collection('shoppinglists').doc(listID)
        .update({
          owners: admin.firestore.FieldValue.arrayRemove(uid),
        })
        .then(() => {
          functions.logger.info(`User ${uid} added to ${listID}`);
        })
        .catch((error) => {
          functions.logger.error(error)
        });
    }
    return Promise.resolve('Nothing updated.')
  });
