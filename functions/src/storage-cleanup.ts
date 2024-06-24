import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { wrappedLogError } from "./rollbar-logger";

type ListItem = {
  images?: string[];
};

export const onListItemImageDelete = functions.firestore
  .document("shoppinglists/{listID}/items/{itemID}")
  .onUpdate(
    wrappedLogError(async (snapshot): Promise<void> => {
      const before = snapshot.before.data() as ListItem;
      if (!before.images || before.images.length === 0) {
        // If there are no images to start, don't bother trying to
        // figure out which/what images were removed.
        return;
      }
      const after = snapshot.after.data() as ListItem;
      const removed = listDifference(before.images || [], after.images || []);
      if (removed.length === 0) {
        return;
      }

      functions.logger.info(
        `Remove shoppinglist item images: ${removed.join(", ")}`,
      );
      await Promise.all(removed.map(deleteImageFile));
    }),
  );

function listDifference(A: string[], B: string[]) {
  const _difference = new Set(A);
  for (const elem of new Set(B)) {
    _difference.delete(elem);
  }
  return [..._difference];
}

async function deleteImageFile(filePath: string) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(filePath);
  const existsResponse = await file.exists();
  const exists = existsResponse[0];
  if (exists) {
    await file.delete();
    functions.logger.info(`Deleted ${filePath} from bucket`);
  } else {
    functions.logger.warn(`file ${filePath} does not exist in bucket`);
  }
}

export const onListItemDeleteImages = functions.firestore
  .document("shoppinglists/{listID}/items/{itemID}")
  .onDelete(
    wrappedLogError(async (snapshot) => {
      const data = snapshot.data() as ListItem;
      if (!data.images || data.images.length === 0) {
        return;
      }
      functions.logger.info(
        `Remove shoppinglist item images: ${data.images.join(", ")}`,
      );
      await Promise.all(data.images.map(deleteImageFile));
    }),
  );
