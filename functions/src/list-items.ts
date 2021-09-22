import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sharp from "sharp";
import * as getRawBody from "raw-body";

// Because they do it
// https://github.com/firebase/extensions/blob/86b62e3fd9a0c2e54fbc053390e644048a39a5eb/storage-resize-images/functions/src/index.ts#L34
sharp.cache(false);

type Images = undefined | string[];
type ImagesThumbnailData = {
  [pathname: string]: string;
};

export const onListItemWithImageWrite = functions.firestore
  .document("shoppinglists/{listID}/items/{itemID}")
  .onWrite(async (change, context) => {
    const { listID, itemID } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const imagesBefore = (beforeData && (beforeData.images as Images)) || [];
    const imagesAfter = (afterData && (afterData.images as Images)) || [];
    if (JSON.stringify(imagesBefore) === JSON.stringify(imagesAfter)) {
      functions.logger.debug(
        `'images' didn't change in shoppinglists/${listID}/items/${itemID}`
      );
      return;
    }
    if (!afterData) {
      functions.logger.debug(
        `No "after data" in shoppinglists/${listID}/items/${itemID}`
      );
      return;
    }
    const imagesThumbnailData: ImagesThumbnailData =
      afterData.imagesThumbnailData || {};
    const imagesThumbnailDataAsArray = await Promise.all(
      imagesAfter.map((imagePath) => {
        if (imagesThumbnailData.imagePath) {
          return imagesThumbnailData.imagePath;
        }
        return imagePathToBase64Data(imagePath);
      })
    );
    imagesAfter.forEach((imagePath, i) => {
      imagesThumbnailData[imagePath] = imagesThumbnailDataAsArray[i];
    });
    await admin
      .firestore()
      .collection(`shoppinglists`)
      .doc(listID)
      .collection("items")
      .doc(itemID)
      .update({ imagesThumbnailData });
  });

// As PNG...
// At width=32, the base64 encoding of images becomes roughly 2,500 - 6,500 bytes.
// That should be small enough to make it sane to store together with the
// images in the 'items' collection. But also an OK thumbnail to look at
// while waiting for the real deal to download.
// As (moz)JPEF...
// At width=64, the base64 encoding of images becomes roughly 2,000 - 3,000 bytes.
async function imagePathToBase64Data(imagePath: string, width: number = 64) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(imagePath as string);
  const imageBuffer = await getRawBody(file.createReadStream());
  const outputBuffer = await sharp(imageBuffer)
    .rotate()
    .resize(width, undefined, {
      fit: "inside",
      withoutEnlargement: true,
    })
    // .png()
    .jpeg({ mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${outputBuffer.toString("base64")}`;
}
