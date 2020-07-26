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
  added: Date;
}

export interface Item extends FirestoreItem {
  id: string;
}

export interface FirestoreList {
  name: string;
  notes: string;
  order: number;
}

export interface List extends FirestoreList {
  id: string;
}
