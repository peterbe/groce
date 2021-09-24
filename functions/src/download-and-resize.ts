import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sharp from "sharp";

import { logError } from "./rollbar-logger";

// Because they do it
// https://github.com/firebase/extensions/blob/86b62e3fd9a0c2e54fbc053390e644048a39a5eb/storage-resize-images/functions/src/index.ts#L34
sharp.cache(false);

// // XXX I still don't know the definition of the kind of error you might get
// // Nothing here! https://googleapis.dev/nodejs/storage/latest/File.html#download
// interface StorageErrorType extends Error {
//   code: number;
// }

const codeToErrorMap: Map<number, string> = new Map();
codeToErrorMap.set(404, "not found");
codeToErrorMap.set(403, "forbidden");
codeToErrorMap.set(401, "unauthenticated");

export const downloadAndResizeAndStore = functions
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
    const fileExtension = path.extname(imagePath);
    const extension = fileExtension.split(".").slice(-1)[0].toLowerCase();
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
      const errorMessage = errorToString(error, "Failed to check widthString");
      res.status(400).send(`width invalid (${errorMessage})`);
      return;
    }

    const CACHE_CONTROL = `public,max-age=${60 * 60 * 24 * 7}`;

    const contentType = extension === "png" ? "image/png" : "image/jpeg";
    const fileName = path.basename(imagePath);
    const fileNameWithoutExtension = path.basename(fileName, fileExtension);
    const modifiedFileName = `${fileNameWithoutExtension}_${width}${fileExtension}`;
    const pathname = (imagePath as string).split("/").slice(1, -1).join("/");
    const destinationPath = `thumbnails/${pathname}/${modifiedFileName}`;
    console.log(`From ${imagePath} to ${destinationPath}`);

    // Attempt to download it right away
    const bucket = admin.storage().bucket();
    let label = `Exists?${destinationPath}`;
    console.time(label);
    try {
      const existsResponse = await bucket.file(destinationPath).exists();
      const exists = existsResponse[0];
      if (exists) {
        console.log(`${destinationPath} exists`);
        const file = await bucket.file(destinationPath).download();
        const contents = file[0];
        console.log(
          `Downloaded ${destinationPath} (${humanFileSize(contents.length)})`
        );
        res.setHeader("content-type", contentType);
        res.setHeader("cache-control", CACHE_CONTROL);
        res.send(contents);
        return;
      }
    } catch (error) {
      console.error(error);
      console.warn(`Error downloading ${destinationPath}`);
      res.setHeader("content-type", "text/plain");
      res.status(500).send(errorToString(error));
      logError(error, req);
      return;
    } finally {
      console.timeEnd(label);
    }

    console.log(`${destinationPath} does not exist`);

    // Doesn't exist as a thumbnail already so have to download.
    const tempFile = path.join(os.tmpdir(), fileName);
    const modifiedFile = path.join(os.tmpdir(), modifiedFileName);

    label = `Download?${destinationPath}`;
    console.time(label);
    try {
      label = `Download?${destinationPath}`;
      console.time(label);
      try {
        await bucket
          .file(imagePath as string)
          .download({ destination: tempFile });
        console.log(`Downloaded ${imagePath} to ${tempFile}`);
      } catch (error) {
        console.warn(`Error downloading ${imagePath}`);
        res.setHeader("content-type", "text/plain");
        res.status(404).send(errorToString(error));
        return;
      } finally {
        console.timeEnd(label);
      }

      const modifiedImageBuffer = await resize(tempFile, width);
      console.log(`Resized ${tempFile} as ${width}`);

      label = `Resize?${destinationPath}`;
      console.time(label);
      await sharp(modifiedImageBuffer).toFile(modifiedFile);
      console.timeEnd(label);
      console.log(`Wrote image buffer to ${modifiedFile}`);

      const metadata: { [key: string]: any } = {
        contentType,
        metadata: {
          imagePath,
          width,
        },
      };
      label = `Upload?${destinationPath}`;
      console.time(label);
      await bucket.upload(modifiedFile, {
        destination: destinationPath,
        metadata,
      });
      console.timeEnd(label);
      console.log(`Uploaded ${modifiedFile} to ${destinationPath}`);
      res.setHeader("content-type", contentType);
      res.setHeader("cache-control", CACHE_CONTROL);
      res.send(modifiedImageBuffer);
    } catch (error) {
      console.error(error);
      console.warn(
        `Error when trying to upload ${modifiedFile} to ${destinationPath}`
      );
      res.setHeader("content-type", "text/plain");
      res.status(500).send(errorToString(error));
      logError(error, req);
      return;
    }
    // Because they say it's important to clean up after yourself
    // https://firebase.google.com/docs/functions/tips#always_delete_temporary_files
    if (fs.existsSync(tempFile)) {
      console.log(`Attempting to unlink ${tempFile}`);
      fs.unlinkSync(tempFile);
    } else {
      console.log(`tempFile (${tempFile}) does not exist.`);
    }
  });

function errorToString(error: any, fallback = "") {
  if (error instanceof Error) {
    return error.toString();
  }
  if (fallback) {
    return fallback;
  }
  return String(error);
}

function resize(file: string, width: number) {
  return sharp(file)
    .rotate()
    .resize(width, undefined, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();
}

function humanFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const num = size / Math.pow(1024, i);
  const round = Math.round(num);
  const numStr: string | number =
    round < 10 ? num.toFixed(2) : round < 100 ? num.toFixed(1) : round;
  return `${numStr} ${"KMGTPEZY"[i - 1]}B`;
}
