import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { logger } from "firebase-functions";

type ListPicture = {
  filePath: string;
  deleted: admin.firestore.Timestamp | null;
  modified: admin.firestore.Timestamp;
};

const MIN_AGE_SECONDS = 60 * 60 * 24 * 2;
export const scheduledCleanupPictureUploads = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    logger.info("Running scheduledCleanupPictureUploads");
    const picturesSnapshot = await admin
      .firestore()
      .collectionGroup("pictures")
      .where("deleted", "!=", null)
      .get();
    let i = 0;
    picturesSnapshot.forEach(async doc => {
      const id = doc.id;
      if (!id) {
        throw new Error("Doc does not have ID");
      }
      const data = doc.data() as ListPicture;
      logger.debug(
        `${i++} id=${doc.id} deleted=${
          data.deleted ? data.deleted.toDate() : null
        } modified=${data.modified.toDate()}`
      );
      if (!data.deleted) {
        return;
      }
      const parent = doc.ref.parent.parent;
      if (!parent) {
        logger.warn("No parent so can't figure out list ID");
        return;
      }

      const age = new Date().getTime() - data.deleted.toDate().getTime();
      const ageSeconds = age / 1000;
      const listID = parent.id;
      if (ageSeconds < MIN_AGE_SECONDS) {
        // logger.debug(
        //   `${
        //     doc.id
        //   } deleted, but not long ago (${data.deleted.toDate().toISOString()})`
        // );
        return;
      }

      const list = await admin
        .firestore()
        .collection("shoppinglists")
        .doc(listID)
        .get();

      if (!list.exists) {
        logger.warn(`Shopping list (${listID}) does not exist`);
        return;
      }

      logger.debug(`Need to delete image ${data.filePath} if it exists`);
      const bucket = admin.storage().bucket();

      const pictureFile = bucket.file(data.filePath);
      const pictureFileExists = (await pictureFile.exists())[0];
      if (pictureFileExists) {
        logger.info(`Can delete ${data.filePath}`);
        await pictureFile.delete();
        logger.info(`Deleted ${data.filePath}`);
      } else {
        logger.warn(`${data.filePath} does not exist`);
      }
      await deleteListPicture(listID, doc.id);
    });
    logger.info(`Found ${i} deleted listpictures to delete`);

    return null;
  });

async function deleteListPicture(
  listID: string,
  pictureID: string
): Promise<void> {
  const collectionRef = admin
    .firestore()
    .collection(`shoppinglists/${listID}/pictures`);
  const itemRef = collectionRef.doc(pictureID);
  itemRef.delete();
  logger.info(`Deleted listpicture ${pictureID} in list ${listID}`);
}
