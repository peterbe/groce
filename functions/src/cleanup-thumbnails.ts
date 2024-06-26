import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import { wrappedLogError } from "./rollbar-logger";

const { logger } = functions;

const OLD_DAYS = 30 * 6; // 6 months
// const ADDITIONAL_DAYS_BACK = 5;
// const ADDITIONAL_DAYS_BACK = 15;
const PREFIX = "thumbnails";

export const scheduledCleanupThumbnails = functions.pubsub
  .schedule("every 24 hours")
  .onRun(
    wrappedLogError(async () => {
      logger.debug("Running scheduledCleanupThumbnails");

      const now = new Date().getTime();
      const range = [...Array(5).keys()];
      range.forEach(async (i) => {
        const ms = (OLD_DAYS - i) * 24 * 60 * 60 * 1000;
        const date = new Date(now - ms);
        const yyyy = date.getFullYear();
        const mm = date.getMonth() + 1;
        const dd = date.getDate();
        const prefix = `${PREFIX}/${yyyy}/${zeroPad(mm)}/${zeroPad(dd)}`;
        await deleteByPrefix(prefix);
      });

      return null;
    }),
  );

function zeroPad(num: number, places = 2): string {
  return `${num}`.padStart(places, "0");
}

async function deleteByPrefix(prefix: string) {
  logger.info(`Looking in ${prefix}`);
  let count = 0;
  let countDeleted = 0;
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({
    prefix,
  });
  let totalSize = 0;
  files.forEach(async (file) => {
    count++;
    const { name, metadata } = file;
    // https://github.com/googleapis/nodejs-storage/blob/master/samples/getMetadata.js
    const updated = new Date(metadata.updated);
    const created = new Date(metadata.timeCreated);
    logger.info(
      `File: ${name} Last updated: ${new Date(updated)} Size: ${metadata.size}`,
    );
    const ageDays =
      (new Date().getTime() - created.getTime()) / 1000 / 60 / 60 / 24;
    logger.debug(`Age (days): ${ageDays}`);

    if (ageDays > 100) {
      totalSize += parseInt(metadata.size, 10);
      countDeleted++;
      await file.delete();
    }
  });
  if (totalSize) {
    logger.info(`In ${prefix}: Deleted total of ${totalSize} worth of data`);
  }
  logger.info(`In ${prefix}: Deleted ${countDeleted}, Analyzed ${count} files`);
}
