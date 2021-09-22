import * as admin from "firebase-admin";

export * from "./feedback";
export * from "./counters";
export * from "./invites";
export * from "./shoppinglists";
export * from "./list-items";
export * from "./download-and-resize";
export * from "./image-to-text";
export * from "./cleanup-picture-uploads";
export * from "./cleanup-thumbnails";
// export * from "./food-words";

admin.initializeApp();
