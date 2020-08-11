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
}

export interface Item extends FirestoreItem {
  id: string;
}

export interface FirestoreList {
  name: string;
  notes: string;
  order: number;
  owners: string[];
}

export interface List extends FirestoreList {
  id: string;
}

export interface AboutInvitation {
  inviter: string;
  name: string;
  notes: string;
  inviter_name: string;
}

export interface FirestoreInvitation {
  // list: string;
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
