import firebase from "firebase/app";

export interface ItemGroup {
  order: number;
  text: string;
}

export interface FirestoreItem {
  text: string;
  description: string;
  group: ItemGroup;
  done: boolean;
  removed: boolean;
  added: firebase.firestore.Timestamp[];
  times_added: number;
}

export interface Item extends FirestoreItem {
  id: string;
}

export interface ListRecentItems {
  text: string;
  description: string;
  done: boolean;
}
export interface FirestoreList {
  name: string;
  notes: string;
  order: number;
  owners: string[];
  // XXX This can cease to be optional because all new lists
  // are created with these set. As of Aug 21.
  recent_items?: ListRecentItems[];
  active_items_count?: number;
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

export interface PastItem {
  text: string;
}
