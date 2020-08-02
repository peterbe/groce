import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { ListOptions } from "./list-options";
import { ListItem } from "./list-item";
import { FirestoreItem, Item, List } from "../../types";

interface Props {
  user: firebase.User | false | null;
  db: firebase.firestore.Firestore;
  id: string;
  lists: List[] | null;
}

const ShoppingList: FunctionalComponent<Props> = ({
  user,
  db,
  id,
  lists,
}: Props) => {
  const [items, setItems] = useState<Item[] | null>(null);

  const list = lists ? lists.find((list) => list.id === id) : null;
  const listNotFound = lists && !list;
  const listError = lists && !list && lists.length;
  const notYourList = !list && lists;

  const [itemsError, setItemsError] = useState<Error | null>(null);

  const [newText, setNewText] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  const [editAction, toggleEditAction] = useState(false);

  useEffect(() => {
    if (!newText.trim()) {
      setSearchSuggestions([]);
    } else if (items) {
      const escaped = newText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rex = new RegExp(`\\b${escaped}`, "i");
      setSearchSuggestions(
        items
          .filter(
            (item) =>
              item.removed && rex.test(item.text) && item.text !== newText
          )
          .map((item) => item.text)
      );
    }
  }, [newText, items]);

  useEffect(() => {
    if (listNotFound) {
      document.title = "🤮 Shopping list not found";
    } else if (listError) {
      document.title = `List error!`;
    } else if (list) {
      document.title = list.notes
        ? `${list.name} (${list.notes})`
        : `${list.name}`;
    } else {
      document.title = "Shopping list";
    }
  }, [list, listNotFound, listError]);

  useEffect(() => {
    let listDbRef: () => void;
    if (list) {
      listDbRef = db.collection(`shoppinglists/${id}/items`).onSnapshot(
        (snapshot) => {
          const newItems: Item[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreItem;
            newItems.push({
              id: doc.id,
              text: data.text,
              description: data.description,
              done: data.done,
              group: data.group,
              removed: data.removed,
              added: data.added,
            });
          });

          // XXX COULD do something intersting with this, like highligting
          // snapshot.docChanges().forEach((change) => {
          //   if (change.type === "added") {
          //     console.log("Added: ", change.doc.data());
          //   }
          //   if (change.type === "modified") {
          //     console.log("Modified city: ", change.doc.data());
          //   }
          //   if (change.type === "removed") {
          //     console.log("Removed city: ", change.doc.data());
          //   }
          // });

          newItems.sort((a, b) => {
            if (a.done && !b.done) {
              return 1;
            } else if (!a.done && b.done) {
              return -1;
            } else {
              // return a.group.order - b.group.order;
              return a.added[0].seconds - b.added[0].seconds;
            }
          });

          setItems(newItems);
        },
        (error) => {
          console.error("Snapshot error:", error);
          setItemsError(error);
        }
      );
    }
    return () => {
      if (listDbRef) {
        console.log("Detach list db ref listener");
        listDbRef();
      }
    };
  }, [id, list, user, db]);

  function clearDoneItems() {
    if (items) {
      const collectionRef = db.collection(`shoppinglists/${id}/items`);
      const batch = db.batch();
      items
        .filter((item) => item.done)
        .forEach((item) => {
          const itemDoc = collectionRef.doc(item.id);
          batch.update(itemDoc, {
            removed: true,
          });
        });

      batch
        .commit()
        .then(() => {
          console.log("All items cleared");
        })
        .catch((error) => {
          console.error("Error doing batch operation", error);
          // XXX Deal with this!
        });
    }
  }

  async function addNewText(text: string) {
    if (!text.trim()) {
      throw new Error("new text empty");
    }
    if (items) {
      // If the exact same text has been used before, reuse it
      const previousItem = items.find(
        (item) => item.text.toLowerCase() === text.toLowerCase()
      );
      if (previousItem) {
        // Update it as not removed and not done
        try {
          await db
            .collection(`shoppinglists/${id}/items`)
            .doc(previousItem.id)
            .set({
              text: text.trim(),
              description: previousItem.description,
              group: previousItem.group,
              done: false,
              removed: false,
              added: [
                firebase.firestore.Timestamp.fromDate(new Date()),
                ...previousItem.added,
              ],
            });
          setNewText("");
          setNewDescription("");
        } catch (error) {
          // XXX deal with this better
          console.error("Unable to update:", error);
          throw error;
        }
      } else {
        // A fresh add
        try {
          await db.collection(`shoppinglists/${id}/items`).add({
            text: text.trim(),
            description: newDescription.trim(),
            group: {
              order: 0,
              text: "",
            },
            done: false,
            removed: false,
            added: [firebase.firestore.Timestamp.fromDate(new Date())],
          });
          // console.log(newDocRef);
          setNewText("");
          setNewDescription("");
        } catch (error) {
          console.error("Unable to add:", error);
          throw error;
        }
      }
    } else {
      console.warn("DB not available");
    }
  }

  function updateItemDoneToggle(item: Item) {
    const itemRef = db.collection(`shoppinglists/${id}/items`).doc(item.id);
    itemRef
      .update({
        done: !item.done,
      })
      .then(() => {
        console.log("Updated", item.id);
      })
      .catch((error) => {
        // XXX Deal with this better.
        console.error(`Error trying to update item ${item.id}:`, error);
      });
  }

  function updateItem(
    item: Item,
    text: string,
    description: string,
    group: string
  ) {
    const itemRef = db.collection(`shoppinglists/${id}/items`).doc(item.id);
    itemRef
      .update({
        text,
        description,
        group: {
          order: item.group.order,
          text: group,
        },
      })
      .then(() => {
        console.log("Updated", item.id);
      })
      .catch((error) => {
        // XXX Deal with this better.
        console.error(`Error trying to update item ${item.id}:`, error);
      });
  }

  if (!user) {
    return (
      <div class={style.list}>
        <Alert
          heading={"You're not signed in"}
          message={<p>Use the menu bar below to sign in first.</p>}
        />
      </div>
    );
  }

  if (notYourList) {
    return (
      <div class={style.list}>
        <Alert
          heading={"Not your shopping list"}
          message={
            <p>
              You&apos;re not an owner or co-owner of list <code>{id}</code>
            </p>
          }
        />
      </div>
    );
  }

  if (listNotFound) {
    return (
      <div class={style.list}>
        <Alert
          heading={"Shopping list not found"}
          message={
            <p>
              No list by the ID <code>{id}</code>
            </p>
          }
        />
      </div>
    );
  }
  if (listError) {
    return (
      <div class={style.list}>
        <Alert
          heading={"List error"}
          message={
            <p>
              List error: <code>{listError.toString()}</code>{" "}
            </p>
          }
        />
      </div>
    );
  }

  let todoItems: Item[] = [];
  let doneItems: Item[] = [];
  let groupOptions: string[] = [];
  if (items) {
    todoItems = items.filter((item) => !item.done && !item.removed);
    doneItems = items.filter((item) => item.done && !item.removed);

    groupOptions = Array.from(
      new Set(
        items.filter((item) => item.group.text).map((item) => item.group.text)
      )
    );
    groupOptions.sort();
  }

  return (
    <div class={style.list}>
      <p class="float-right">
        <button
          type="button"
          class={editAction ? "btn btn-sm btn-info" : "btn btn-sm"}
          onClick={() => {
            toggleEditAction(!editAction);
          }}
        >
          {editAction ? "Close" : "List options"}
        </button>
      </p>
      {list && (
        <h2>
          {list.name}{" "}
          {/* {list.notes && (
            <small class="text-muted" style={{ fontSize: "60%" }}>
              {list.notes}
            </small>
          )} */}
        </h2>
      )}

      {list && editAction && (
        <ListOptions
          db={db}
          user={user}
          list={list}
          close={() => {
            toggleEditAction(false);
          }}
        />
      )}

      {itemsError && (
        <Alert
          heading="List items error"
          message={
            <p>
              Items error: <code>{itemsError.toString()}</code>
            </p>
          }
        />
      )}

      {!editAction && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await addNewText(newText);
          }}
        >
          <div class="input-group">
            <input
              type="search"
              class="form-control"
              value={newText}
              onInput={({
                currentTarget,
              }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                setNewText(currentTarget.value);
              }}
              aria-label="Text input with segmented dropdown button"
              placeholder="Add new item..."
              disabled={!items}
            />
            <button
              type="submit"
              class="btn btn-outline-secondary"
              disabled={!newText.trim()}
            >
              Add
            </button>
          </div>

          {items && (
            <div class={style.search_suggestions}>
              {searchSuggestions.length ? (
                <p>
                  {searchSuggestions.map((suggestion) => {
                    return (
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        key={suggestion}
                        style={{ marginRight: 5 }}
                        onClick={async () => {
                          // setNewText(suggestion);
                          await addNewText(suggestion);
                        }}
                      >
                        {suggestion}?
                      </button>
                    );
                  })}
                </p>
              ) : (
                <p>&nbsp;</p>
              )}
            </div>
          )}
        </form>
      )}

      {!items && (
        <div class={style.loading_list_items}>
          <div>
            <p class="text-center">
              <strong>Loading shopping list...</strong>
            </p>
          </div>
          <div class="text-center">
            <div class="spinner-border" role="status">
              <span class="sr-only">Loading...</span>
            </div>
          </div>
        </div>
      )}

      {items && !todoItems.length && !doneItems.length && (
        <p class={style.empty_list}>List is empty at the moment.</p>
      )}

      {!editAction && !!todoItems.length && (
        <ul class="list-group">
          {todoItems
            .filter((item) => !item.done)
            .map((item) => {
              return (
                <ListItem
                  key={item.id}
                  item={item}
                  groupOptions={groupOptions}
                  toggleDone={updateItemDoneToggle}
                  updateItem={updateItem}
                />
              );
            })}
        </ul>
      )}
      {!editAction && !!doneItems.length && (
        <div class={style.done_items}>
          <h5>Done items</h5>
          <ul class="list-group">
            {doneItems
              .filter((item) => item.done)
              .map((item) => {
                return (
                  <ListItem
                    key={item.id}
                    item={item}
                    groupOptions={groupOptions}
                    toggleDone={updateItemDoneToggle}
                    updateItem={updateItem}
                  />
                );
              })}
          </ul>
        </div>
      )}

      {!editAction && !!doneItems.length ? (
        <div class={style.clearitems}>
          <button
            type="button"
            class="btn btn-info btn-lg btn-block"
            onClick={(event) => {
              event.preventDefault();
              clearDoneItems();
            }}
          >
            Clear done items
          </button>
        </div>
      ) : null}

      <GoBack url="/shopping" name="all lists" />
    </div>
  );
};

export default ShoppingList;
