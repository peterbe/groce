import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const onInviteAccept = functions.firestore
  .document("shoppinglists/{listID}/invitations/{invitationID}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    const acceptedBefore = new Set(previousValue.accepted);
    console.log(
      `${context.params.invitationID} acceptedBefore: ${Array.from(
        acceptedBefore
      )}`
    );
    const acceptedAfter = new Set(newValue.accepted);
    console.log(
      `${context.params.invitationID} acceptedAfter: ${Array.from(
        acceptedAfter
      )}`
    );
    const removedUID = [...acceptedBefore].filter((x) => !acceptedAfter.has(x));
    const addedUID = [...acceptedAfter].filter((x) => !acceptedBefore.has(x));

    console.log(
      `addedUID: ${JSON.stringify(addedUID)}  removedUID: ${JSON.stringify(
        removedUID
      )}`
    );
    const listID = context.params.listID;

    if (addedUID.length) {
      await Promise.all(
        addedUID.map((uid) => {
          console.log(`ADDING ${uid} from list ${listID}`);
          return admin
            .firestore()
            .collection("shoppinglists")
            .doc(listID)
            .update({
              owners: admin.firestore.FieldValue.arrayUnion(uid),
            });
        })
      );
    }

    if (removedUID.length) {
      await Promise.all(
        removedUID.map((uid) => {
          console.log(`REMOVING ${uid} from list ${listID}`);

          return admin
            .firestore()
            .collection("shoppinglists")
            .doc(listID)
            .update({
              owners: admin.firestore.FieldValue.arrayRemove(uid),
            });
        })
      );
    }
  });
