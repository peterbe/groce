import * as admin from "firebase-admin";

export * from "./feedback";
export * from "./counters";
export * from "./invites";
export * from "./shoppinglists";
export * from "./download-and-resize";
// export * from "./image-to-text";

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
