import * as admin from "firebase-admin";

export * from "./feedback";
export * from "./counters";
export * from "./invites";
export * from "./shoppinglists";
export * from "./list-items";
export * from "./download-and-resize";
export * from "./image-to-text";
export * from "./foodwords";
export * from "./storage-cleanup";
// Remember, you can't run scheduled jobs in the emulator.
// See https://stackoverflow.com/a/61253896
// To test in emulator, write a HTTP function and use
// process.env.FUNCTIONS_EMULATOR to decide to let it call to the
// function manually.
export * from "./cleanup-picture-uploads";
export * from "./cleanup-thumbnails";
export * from "./cleanup-shoppinglists";

admin.initializeApp();
