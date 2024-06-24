import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sharp from "sharp";
import * as getRawBody from "raw-body";

// Because they do it
// https://github.com/firebase/extensions/blob/86b62e3fd9a0c2e54fbc053390e644048a39a5eb/storage-resize-images/functions/src/index.ts#L34
sharp.cache(false);

type PictureData = {
  filePath: string;
};

export const onListPictureCreateMakeDataThumbnail = functions.firestore
  .document("shoppinglists/{listID}/pictures/{pictureID}")
  .onCreate(async (snapshot, context) => {
    const { listID, pictureID } = context.params;
    const data = snapshot.data() as PictureData;
    const { filePath } = data;
    const imageThumbnailData = await imagePathToBase64Data(filePath);
    functions.logger.info(
      `From ${filePath} to ${imageThumbnailData.length.toLocaleString()} base64 data string.`,
    );

    await admin
      .firestore()
      .collection("shoppinglists")
      .doc(listID)
      .collection("pictures")
      .doc(pictureID)
      .update({ imageThumbnailData });
  });

// From testing, it appears JPEG with 'mozjpeg' yields much better results.
// And it seems to work fine no matter what input format it is.
async function imagePathToBase64Data(imagePath: string, width = 128) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(imagePath);
  const imageBuffer = await getRawBody(file.createReadStream());
  const outputBuffer = await sharp(imageBuffer)
    .rotate()
    .resize(width, undefined, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${outputBuffer.toString("base64")}`;
}
