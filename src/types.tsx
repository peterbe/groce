import firebase from "firebase/app";

// I don't know if this is right! But it works. Now I can use `error.code`
export interface StorageErrorType extends Error {
  code: string;
}

export interface ItemGroup {
  order: number;
  text: string;
}

export interface FirestoreItem {
  text: string;
  description: string;
  group: ItemGroup;
  quantity: number;
  done: boolean | firebase.firestore.Timestamp;
  removed: boolean | firebase.firestore.Timestamp;
  added: firebase.firestore.Timestamp[];
  times_added: number;
  images?: string[];
}

export interface Item extends FirestoreItem {
  id: string;
}

export interface FirestoreListPicture {
  filePath: string;
  notes: string;
  created: firebase.firestore.Timestamp;
  modified: firebase.firestore.Timestamp;
  deleted?: firebase.firestore.Timestamp;
}

export interface ListPicture extends FirestoreListPicture {
  id: string;
}

export interface FirestoreListPictureText {
  filePath: string;
  created: firebase.firestore.Timestamp;
  text: string;
  foodWords: string[];
}

export interface ListPictureText extends FirestoreListPictureText {
  id: string;
}

export interface FirestoreSuggestedFoodword {
  word: string;
  locale: string;
  created: firebase.firestore.Timestamp;
  creator_uid?: string;
  creator_email?: string;
}

export interface SuggestedFoodword extends FirestoreSuggestedFoodword {
  id: string;
}

export interface FirestoreListWordOption {
  word: string;
  created: firebase.firestore.Timestamp;
  modified: firebase.firestore.Timestamp;
  alias?: string;
  ignore?: boolean;
}
export interface ListWordOption extends FirestoreListWordOption {
  id: string;
}

export interface ListRecentItems {
  text: string;
  description: string;
  done: boolean;
  quantity: number;
}

export interface ListConfig {
  disableGroups: boolean;
  disableQuantity: boolean;
  disableDefaultSuggestions: boolean;
  disableFireworks: boolean;
}

export interface OwnerMetadata {
  email?: string;
  displayName?: string;
  photoURL?: string;
}

export interface FirestoreList {
  name: string;
  notes: string;
  order: number;
  added: firebase.firestore.Timestamp;
  owners: string[];
  ownersMetadata: Record<string, OwnerMetadata>;
  config: ListConfig;
  // XXX This can cease to be optional because all new lists
  // are created with these set. As of Aug 21.
  recent_items?: ListRecentItems[];
  active_items_count?: number;
  modified: firebase.firestore.Timestamp;
}

export interface FirestoreDocumentMetadata {
  hasPendingWrites: boolean;
  fromCache: boolean;
}

export interface List extends FirestoreList {
  id: string;
  metadata: FirestoreDocumentMetadata;
}

export interface AboutInvitation {
  id: string;
  inviter: string;
  name: string;
  notes: string;
  inviter_name: string;
}

export interface FirestoreInvitation {
  email: string | null;
  added: firebase.firestore.Timestamp;
  expires: firebase.firestore.Timestamp;
  inviter_uid: string;
  about: AboutInvitation;
  accepted: string[];
}

export interface Invitation extends FirestoreInvitation {
  id: string;
}

export interface SearchSuggestion {
  text: string;
  popularity: number;
}

export interface StorageSpec {
  add?: string;
  remove?: string;
  downloadURL?: string;
  size?: number;
  type?: string;
  error?: string;
}

export interface FirestoreFoodWord {
  locale: string;
  word: string;
  hitCount: number;
  notes: string;
}
export interface FoodWord extends FirestoreFoodWord {
  id: string;
}
