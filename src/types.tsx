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

export interface AboutInvite {
  inviter: string;
  name: string;
  notes: string;
}

export interface FirestoreInvite {
  list: string;
  email: string | null;
  added: firebase.firestore.Timestamp;
  expires: firebase.firestore.Timestamp;
  inviter_uid: string;
  about: AboutInvite;
}

export interface Invite extends FirestoreInvite {
  id: string;
}

export interface PastItem {
  text: string;
}
