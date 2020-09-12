import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import Sortable from "sortablejs";

import { List, Item } from "../../types";
import * as style from "./style.css";

interface Props {
  db: firebase.firestore.Firestore;
  list: List;
  items: Item[];
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
}: Props) => {
  function changeGroupText(
    group: Group,
    newText: string,
    order: null | number
  ) {
    const collectionRef = db.collection(`shoppinglists/${list.id}/items`);
    const batch = db.batch();
    let batchCount = 0;
    items.forEach((item) => {
      if (item.group.text.toLowerCase() === group.text.toLowerCase()) {
        const itemDoc = collectionRef.doc(item.id);
        batchCount++;
        batch.update(itemDoc, {
          group: {
            text: newText,
            order: order !== null ? order : group.order,
          },
        });
      }
    });
    if (batchCount) {
      batch
        .commit()
        .then(() => {
          console.log(`${batchCount} Items edited`);
        })
        .catch((error) => {
          console.error("Error doing batch edit", error);
        });
    }
  }

  function deleteGroup(group: Group) {
    changeGroupText(group, "", 0);
  }

  function saveNewOrders(order: Map<string, number>) {
    const collectionRef = db.collection(`shoppinglists/${list.id}/items`);
    const batch = db.batch();
    let batchCount = 0;
    items.forEach((item) => {
      if (order.has(item.group.text.toLowerCase())) {
        const newOrder = order.get(item.group.text.toLowerCase());
        if (item.group.order !== newOrder) {
          const itemDoc = collectionRef.doc(item.id);
          batchCount++;
          batch.update(itemDoc, {
            group: {
              text: item.group.text,
              order: newOrder,
            },
          });
        }
      }
    });

    if (batchCount) {
      batch
        .commit()
        .then(() => {
          console.log(`${batchCount} Items edited`);
        })
        .catch((error) => {
          console.error("Error doing batch edit", error);
        });
    }
  }

  useEffect(() => {
    const el = document.getElementById("sortable");
    if (!el) {
      return;
    }
    new Sortable(el, {
      animation: 150,
      ghostClass: "blue-background-class",
      handle: ".handle",
      onEnd: (event) => {
        const children = event.to.children;
        const newOrder = new Map();
        Array.from(children).forEach((item, i) => {
          newOrder.set(
            (item as HTMLElement).dataset.text?.toLowerCase(),
            i + 1
          );
        });
        saveNewOrders(newOrder);
      },
    });
  }, []);

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
      <p>Drag to change order. Click to edit.</p>
      {groups.length ? (
        <ul class="list-group" id="sortable">
          {groups.map((group) => {
            return (
              <ListItem
                group={group}
                key={group.text}
                changeText={(text: string) => {
                  if (group.text.trim() !== text.trim()) {
                    changeGroupText(group, text, null);
                  }
                }}
                deleteGroup={(group: Group) => {
                  deleteGroup(group);
                }}
              />
            );
          })}
        </ul>
      ) : (
        <i>No groups to organize at the moment.</i>
      )}
    </div>
  );
};

function ListItem({
  group,
  changeText,
  deleteGroup,
}: {
  group: Group;
  changeText: (newText: string) => void;
  deleteGroup: (group: Group) => void;
}) {
  const [edit, toggleEdit] = useState(false);
  const [text, setText] = useState(group.text);
  const [confirm, setConfirm] = useState(false);
  return (
    <li
      class="list-group-item  d-flex justify-content-between align-items-center"
      data-text={group.text}
    >
      {edit ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            changeText(text);
            toggleEdit(false);
          }}
        >
          <input
            type="text"
            class="form-control"
            value={text}
            onInput={({
              currentTarget,
            }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
              setText(currentTarget.value);
            }}
          />{" "}
          {!confirm && (
            <button type="submit" class="btn btn-sm btn-info">
              Save
            </button>
          )}{" "}
          {confirm && (
            <button
              type="button"
              class="btn btn-sm btn-danger"
              onClick={() => {
                deleteGroup(group);
              }}
            >
              Confirm
            </button>
          )}{" "}
          <button
            type="button"
            class="btn btn-sm btn-warning"
            onClick={() => {
              setConfirm((prev) => !prev);
            }}
          >
            {confirm ? "Cancel" : "Delete"}
          </button>
        </form>
      ) : (
        <span>
          <span class="handle">↕</span> {group.text}
        </span>
      )}

      <button
        type="button"
        class="btn btn-sm"
        onClick={() => {
          toggleEdit((prev) => !prev);
        }}
      >
        {edit ? "Close" : "Edit"}
      </button>
    </li>
  );
}
