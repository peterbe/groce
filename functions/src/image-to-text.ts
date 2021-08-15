import * as path from "path";

import * as vision from "@google-cloud/vision";
import * as functions from "firebase-functions";
import { logger } from "firebase-functions";

const client = new vision.ImageAnnotatorClient();

export const onFileUploadToText = functions.storage.object().onFinalize(
  async (object): Promise<void> => {
    const { contentType, name } = object;

    if (!name) {
      logger.warn(`object without a name ${object}`);
      return;
    }
    const tmpFilePath = path.resolve("/", path.dirname(name)); // Absolute path to dirname
    logger.info(`Uploaded '${name}' (${contentType}) called ${tmpFilePath}`);
    // console.log(await client.textDetection(name));
    const filePath = "/Users/peterbe/dev/GROCER/toasted-pita-wedges.jpg";
    console.log(`Manually testing vision on ${filePath}`);
    console.log(await client.textDetection(filePath));

    // const [result] = await client.labelDetection('./resources/wakeupcat.jpg');
    // const labels = result.labelAnnotations;
    // console.log('Labels:');
    // labels.forEach(label => console.log(label.description));
  }
);
