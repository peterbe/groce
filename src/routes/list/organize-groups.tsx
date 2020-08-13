import { FunctionalComponent, h } from "preact";
// import { route } from "preact-router";
import { useState } from "preact/hooks";

import { Alert } from "../../components/alerts";
import { List, Item } from "../../types";
import * as style from "./style.css";
// import * as style from "./groups.css";

interface Props {
  db: firebase.firestore.Firestore;
  list: List;
  items: Item[];
  user: firebase.User;
  close: () => void;
}

interface Group {
  text: string;
  order: number;
}

export const OrganizeGroups: FunctionalComponent<Props> = ({
  db,
  list,
  items,
  close,
  user,
}: Props) => {
  //   const groups = items.map((item) => item.group);
  const uniqueGroups = new Map(
    items.map((item) => {
      return [item.group.text, item.group.order];
    })
  );
  const groups: Group[] = [];
  uniqueGroups.forEach((order: number, text: string) => {
    if (text) {
      groups.push({ order, text });
    }
  });
  groups.sort((a: Group, b: Group) => {
    if (a.order === b.order) {
      return a.text.localeCompare(b.text);
    } else {
      return a.order - b.order;
    }
  });

  console.log(groups);

  return (
    <div class={style.organize_groups}>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary"
        onClick={() => {
          close();
        }}
      >
        &larr; back to shopping list
      </button>

      <ul>
        {groups.map((group) => {
          return <li key={group.text}>{group.text}</li>;
        })}
      </ul>
    </div>
  );
};
