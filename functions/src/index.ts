import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const postmark = require("postmark");
import * as sharp from "sharp";

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

// XXX I still don't know the definition of the kind of error you might get
// Nothing here! https://googleapis.dev/nodejs/storage/latest/File.html#download
interface StorageErrorType extends Error {
  code: number;
}

const codeToErrorMap: Map<number, string> = new Map();
codeToErrorMap.set(404, "not found");
codeToErrorMap.set(403, "forbidden");
codeToErrorMap.set(401, "unauthenticated");

export const downloadAndResize = functions
  .runWith({ memory: "1GB" })
  .https.onRequest(async (req, res) => {
    const imagePath = req.query.image || "";
    if (!imagePath) {
      res.status(400).send("missing 'image'");
      return;
    }
    if (typeof imagePath !== "string") {
      res.status(400).send("can only be one 'image'");
      return;
    }
    const widthString = req.query.width || "";
    if (!widthString || typeof widthString !== "string") {
      res.status(400).send("missing 'width' or not a single string");
      return;
    }
    const extension = imagePath.toLowerCase().split(".").slice(-1)[0];
    if (!["jpg", "png", "jpeg"].includes(extension)) {
      res.status(400).send(`invalid extension (${extension})`);
      return;
    }
    let width = 0;
    try {
      width = parseInt(widthString);
      if (width < 0) {
        throw new Error("too small");
      }
      if (width > 1000) {
        throw new Error("too big");
      }
    } catch (error) {
      res.status(400).send(`width invalid (${error.toString()}`);
      return;
    }

    admin
      .storage()
      .bucket()
      .file(imagePath)
      .download()
      .then((downloadData) => {
        const contents = downloadData[0];
        console.log(
          `downloadAndResize (${JSON.stringify({
            width,
            imagePath,
          })}) downloadData.length=${humanFileSize(contents.length)}\n`
        );

        const contentType = extension === "png" ? "image/png" : "image/jpeg";
        sharp(contents)
          .rotate() // auto-rotates based on EXIF
          .resize(width)
          .toBuffer()
          .then((buffer) => {
            res.setHeader("content-type", contentType);
            // TODO increase some day
            res.setHeader("cache-control", `public,max-age=${60 * 60 * 24}`);
            res.send(buffer);
          })
          .catch((error: Error) => {
            console.error(`Error reading in with sharp: ${error.toString()}`);
            res
              .status(500)
              .send(`Unable to read in image: ${error.toString()}`);
          });
      })
      .catch((error: StorageErrorType) => {
        if (error.code && codeToErrorMap.has(error.code)) {
          res.status(error.code).send(codeToErrorMap.get(error.code));
        } else {
          res.status(500).send(error.message);
        }
      });
  });

function humanFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const num = size / Math.pow(1024, i);
  const round = Math.round(num);
  const numStr: string | number =
    round < 10 ? num.toFixed(2) : round < 100 ? num.toFixed(1) : round;
  return `${numStr} ${"KMGTPEZY"[i - 1]}B`;
}

export const onFeedbackSubmitted = functions.firestore
  .document("feedback/{feedbackID}")
  .onCreate((snapshot, context) => {
    const data = snapshot.data();
    console.log(
      `Feedback created: feedbackID=${
        context.params.feedbackID
      } data=${JSON.stringify(data)}`
    );

    return Promise.resolve("Nothing updated.");
  });

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
      .then((doc) => {
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
          .then((snapshot) => {
            const items: BriefItem[] = [];
            snapshot.forEach((doc) => {
              // doc.data() is never undefined for query doc snapshots
              // console.log("ITEM...", doc.id, " => ", doc.data());
              const data = doc.data();
              items.push({
                text: data.text,
                description: data.description,
                added: data.added[0].toDate(),
                quantity: data.quantity || 0,
                done: data.done,
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
              .map((item) => {
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
                modified: admin.firestore.Timestamp.fromDate(new Date()),
              })
              .then(() => {
                return Promise.resolve(
                  `Wrote recent_items: ${JSON.stringify(recentItems)}`
                );
              })
              .catch((error) => {
                console.error("Error trying to write recent_items", error);
                return Promise.reject(error);
              });
          })
          .catch((error) => {
            console.error("Error getting items snapshot", error);
            return Promise.reject(error);
          });
      })
      .catch((error) => {
        console.log("Error getting shopping list:", error);
        return Promise.reject(error);
      });
  });

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
      owners.map((uid) => admin.auth().getUser(uid))
    );
    for (const user of users) {
      ownersMetadata[user.uid] = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
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
          ownersMetadata,
        });
    }
  });

export const onFeedbackAdded = functions.firestore
  .document("feedback/{feedbackID}")
  .onCreate((snap, context) => {
    const data = snap.data();
    const client = new postmark.Client(
      functions.config().postmark.server_api_token
    );

    return client.sendEmail({
      From: "That's Groce! <mail@peterbe.com>",
      To: "peterbe@gmail.com",
      Subject: `New feedback on That's Groce!: ${data.subject}`,
      TextBody: `Feedback ID: ${context.params.feedbackID}
Subject: ${data.subject}
Topic: ${data.topic}
Text: ${data.text}
User: ${data.user.displayName || "*no name*"} (${
        data.user.email || "*no email*"
      })

Sent: ${new Date().toLocaleString()}`,
    });
  });

export const onShoppinglistItemUpdateCounter = functions.firestore
  .document("shoppinglists/{listID}/items/{itemID}")
  .onUpdate((change, context) => {
    const newValue = change.after.data();
    // ...or the previous value before this update
    const previousValue = change.before.data();
    // console.log(
    //   "DONE BEFORE?",
    //   previousValue.done,
    //   "DONE NOW?",
    //   newValue.done,
    //   "REMOVED BEFORE?",
    //   previousValue.removed,
    //   "REMOVED NOW?",
    //   newValue.removed
    // );
    if (!previousValue.done && newValue.done) {
      const now = new Date();
      const [year, month, day] = now.toISOString().split("T")[0].split("-");
      return admin
        .firestore()
        .collection("counters")
        .doc("itemsDone")
        .update({
          ever: admin.firestore.FieldValue.increment(1),
          [year]: admin.firestore.FieldValue.increment(1),
          [`${year}-${month}`]: admin.firestore.FieldValue.increment(1),
          [`${year}-${month}-${day}`]: admin.firestore.FieldValue.increment(1),
        });
    } else {
      return Promise.resolve();
    }
  });

export const onShoppinglistsCreateCounter = functions.firestore
  .document("shoppinglists/{listID}")
  .onCreate(async () => {
    const now = new Date();
    const [year, month, day] = now.toISOString().split("T")[0].split("-");
    return admin
      .firestore()
      .collection("counters")
      .doc("listsCreated")
      .update({
        ever: admin.firestore.FieldValue.increment(1),
        [year]: admin.firestore.FieldValue.increment(1),
        [`${year}-${month}`]: admin.firestore.FieldValue.increment(1),
        [`${year}-${month}-${day}`]: admin.firestore.FieldValue.increment(1),
      });
  });
