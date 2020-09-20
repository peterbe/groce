import { FunctionalComponent, h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { Loading } from "../../components/loading";
import { OfflineWarning } from "../../components/offline-warning";
import { ListOptions } from "./list-options";
import { OrganizeGroups } from "./organize-groups";
import { ListItem } from "./list-item";
import { ITEM_SUGGESTIONS, GROUP_SUGGESTIONS } from "./default-suggestions";
import {
  FirestoreItem,
  Item,
  List,
  SearchSuggestion,
  ItemGroup,
} from "../../types";

interface Props {
  user: firebase.User | false | null;
  db: firebase.firestore.Firestore | null;
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

  const [editAction, toggleEditAction] = useState(false);
  const [editGroups, toggleEditGroups] = useState(false);

  useEffect(() => {
    if (listNotFound) {
      document.title = "🤮 Shopping list not found";
    } else if (listError) {
      document.title = `💩List error!`;
    } else if (editAction) {
      document.title = "List options";
    } else if (list) {
      const countTodoItems = items
        ? items.filter((i) => !i.removed && !i.done).length
        : 0;
      document.title = countTodoItems
        ? `(${countTodoItems}) ${list.name}`
        : `${list.name}`;
    } else {
      document.title = "Shopping list";
    }
  }, [items, list, listNotFound, listError, editAction]);

  const [snapshotsOffline, toggleSnapshotsOffline] = useState(false);

  const [recentlyModifiedItems, setRecentlyModifiedItems] = useState<
    Map<string, Date>
  >(new Map());

  useEffect(() => {
    let ref: () => void;
    if (db && list) {
      ref = db.collection(`shoppinglists/${id}/items`).onSnapshot(
        // { includeMetadataChanges: true },
        (snapshot) => {
          if (
            snapshot.metadata.fromCache &&
            snapshot.metadata.hasPendingWrites
          ) {
            toggleSnapshotsOffline(true);
          } else {
            toggleSnapshotsOffline(false);
          }

          const newItems: Item[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreItem;
            newItems.push({
              id: doc.id,
              text: data.text,
              description: data.description,
              done: data.done,
              group: data.group,
              quantity: data.quantity || 0,
              removed: data.removed,
              added: data.added,
              times_added: data.times_added || 1,
            });
          });

          newItems.sort((a, b) => {
            if (a.done && !b.done) {
              return 1;
            } else if (!a.done && b.done) {
              return -1;
            } else {
              if (a.group.order !== b.group.order) {
                return a.group.order - b.group.order;
              }
              // Descending order. More recent additions on top.
              return b.added[0].seconds - a.added[0].seconds;
            }
          });

          setItems(newItems);

          snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
              // const newRecentlyModifiedItems = new Map(recentlyModifiedItems);
              const newRecentlyModifiedItems = new Map();
              newRecentlyModifiedItems.set(change.doc.id, new Date());
              setRecentlyModifiedItems(newRecentlyModifiedItems);
            }
          });
        },
        (error) => {
          console.error("Snapshot error:", error);
          setItemsError(error);
        }
      );
    }
    return () => {
      if (ref) {
        ref();
      }
    };
  }, [id, list, user, db]);

  const [clearedItems, setClearedItems] = useState<Item[]>([]);

  const clearTimerRef = useRef();

  useEffect(() => {
    if (clearedItems.length) {
      clearTimerRef.current = setTimeout(() => {
        if (clearTimerRef.current) {
          setClearedItems([]);
        }
      }, 10000);
    }
    return () => {
      clearTimerRef.current = null;
    };
  }, [clearedItems, clearTimerRef]);

  function clearDoneItems() {
    if (db && items) {
      const cleared: Item[] = [];
      const collectionRef = db.collection(`shoppinglists/${id}/items`);
      const batch = db.batch();
      items
        .filter((item) => item.done && !item.removed)
        .forEach((item) => {
          const itemDoc = collectionRef.doc(item.id);
          batch.update(itemDoc, {
            removed: true,
          });
          cleared.push(item);
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
      setClearedItems(cleared);
    }
  }

  function undoClearDoneItems() {
    if (db && items) {
      const collectionRef = db.collection(`shoppinglists/${id}/items`);
      const batch = db.batch();
      clearedItems.forEach((item) => {
        const itemDoc = collectionRef.doc(item.id);
        console.log(item);
        batch.update(itemDoc, {
          removed: false,
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
      setClearedItems([]);
    }
  }

  function addNewText(text: string) {
    if (!text.trim()) {
      throw new Error("new text empty");
    }
    if (!items || !db) {
      console.warn("DB not available");
      return;
    }
    // If the exact same text has been used before, reuse it
    const previousItem = items.find(
      (item) => item.text.toLowerCase() === text.toLowerCase()
    );
    if (previousItem) {
      // Update it as not removed and not done
      db.collection(`shoppinglists/${id}/items`)
        .doc(previousItem.id)
        .set({
          text: previousItem.text,
          description: previousItem.description,
          group: previousItem.group,
          quantity: 0,
          done: false,
          removed: false,
          added: [
            firebase.firestore.Timestamp.fromDate(new Date()),
            ...previousItem.added,
          ],
          times_added: (previousItem.times_added || 1) + 1,
        })
        .catch((error) => {
          console.error("Unable to update:", error);
          throw error;
        });
    } else {
      // A fresh add
      db.collection(`shoppinglists/${id}/items`)
        .add({
          text: text.trim(),
          description: "",
          group: {
            order: 0,
            text: "",
          },
          quantity: 0,
          done: false,
          removed: false,
          added: [firebase.firestore.Timestamp.fromDate(new Date())],
          times_added: 1,
        })
        .catch((error) => {
          console.error("Error trying to add new item:", error);
          throw error;
        });
    }
  }

  function updateItemDoneToggle(item: Item) {
    if (db) {
      const itemRef = db.collection(`shoppinglists/${id}/items`).doc(item.id);
      itemRef
        .update({
          done: !item.done,
        })
        // .then(() => {
        //   console.log("Updated", item.id);
        // })
        .catch((error) => {
          // XXX Deal with this better.
          console.error(`Error trying to update item ${item.id}:`, error);
        });
    }
  }

  function updateItem(
    item: Item,
    text: string,
    description: string,
    group: string,
    quantity: number
  ) {
    if (db) {
      const itemRef = db.collection(`shoppinglists/${id}/items`).doc(item.id);

      const thisGroup = group.trim().toLowerCase();

      let groupOrder = 0;
      if (group.trim() && items) {
        // Seek the highest group order of any item that matches this.
        groupOrder = Math.max(
          ...items
            .filter((item) => item.group.text.toLowerCase() === thisGroup)
            .map((item) => item.group.order)
        );
      }

      // Preserve the way you've always been spelling it.
      // For example, if you have at least one group called "Shoes"
      // but now you typed "shoes", the override that spelling.
      let groupText = group.trim();
      if (groupText && items) {
        const previousSame = items
          .filter((item) => item.group.text.toLowerCase() === thisGroup)
          .map((item) => item.group.text)
        if (previousSame.length) {
          groupText = previousSame[0]
        }
      }

      const groupItem = {
        order: groupOrder,
        text: groupText,
      };
      itemRef
        .update({
          text: text.trim(),
          description: description.trim(),
          group: groupItem,
          quantity,
        })
        .then(() => {
          console.log("Updated", item.id);
        })
        .catch((error) => {
          // XXX Deal with this better.
          console.error(`Error trying to update item ${item.id}:`, error);
        });
    }
  }

  if (user === false) {
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
          offerReload={true}
        />
      </div>
    );
  }

  let todoItems: Item[] = [];
  let doneItems: Item[] = [];
  const groupOptions: string[] = [];
  const groupOptionsSet: Set<string> = new Set();
  if (items) {
    todoItems = items.filter((item) => !item.done && !item.removed);
    doneItems = items.filter((item) => item.done && !item.removed);

    for (const item of items) {
      if (item.group && item.group.text) {
        const normalized = stripEmojis(item.group.text.toLowerCase());
        if (!groupOptionsSet.has(normalized)) {
          groupOptionsSet.add(normalized);
          groupOptions.push(item.group.text);
        }
      }
    }
  }
  // Also, append any of the default group suggestions
  // ...that haven't already been included.
  for (const suggestion of GROUP_SUGGESTIONS) {
    if (!groupOptionsSet.has(suggestion.toLowerCase())) {
      groupOptions.push(suggestion);
    }
  }

  const hasOrganizableGroups = Boolean(
    !(list && list.config.disableGroups) &&
      items &&
      items.filter((item) => !item.removed && item.group.text).length > 1
  );

  return (
    <div class={style.list}>
      {snapshotsOffline && <OfflineWarning />}

      <p class="float-right hide-in-print">
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
      {list && <h2>{list.name} </h2>}

      {db && user && list && editAction && (
        <ListOptions
          db={db}
          user={user}
          list={list}
          close={() => {
            toggleEditAction(false);
          }}
        />
      )}

      {db && items && list && editGroups && hasOrganizableGroups && (
        <OrganizeGroups
          db={db}
          list={list}
          items={items}
          close={() => {
            toggleEditGroups(false);
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
          offerReload={true}
        />
      )}

      {!editAction && !editGroups && (
        <NewItemForm
          ready={!!items}
          items={items}
          // searchSuggestions={searchSuggestions}
          saveHandler={(text: string) => {
            addNewText(text);
          }}
        />
      )}

      {!items && <Loading text="Loading shopping list..." />}

      {items &&
        !editAction &&
        !editGroups &&
        !todoItems.length &&
        !doneItems.length && (
          <p class={style.empty_list}>List is empty at the moment.</p>
        )}

      {!editAction && !editGroups && !!todoItems.length && (
        <ul class="list-group">
          {todoItems
            .filter((item) => !item.done)
            .map((item) => {
              return (
                <ListItem
                  key={item.id}
                  item={item}
                  modified={recentlyModifiedItems.get(item.id) || null}
                  groupOptions={groupOptions}
                  disableGroups={list ? list.config.disableGroups : false}
                  disableQuantity={list ? list.config.disableQuantity : false}
                  toggleDone={updateItemDoneToggle}
                  updateItem={updateItem}
                />
              );
            })}
        </ul>
      )}
      {!editAction && !editGroups && !!doneItems.length && (
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
                    modified={recentlyModifiedItems.get(item.id) || null}
                    groupOptions={groupOptions}
                    disableGroups={list ? list.config.disableGroups : false}
                    disableQuantity={list ? list.config.disableQuantity : false}
                    toggleDone={updateItemDoneToggle}
                    updateItem={updateItem}
                  />
                );
              })}
          </ul>
        </div>
      )}

      {!editAction && !editGroups && !!doneItems.length ? (
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

      {!editAction && !editGroups && !!clearedItems.length && (
        <div class={style.clearitems}>
          <button
            type="button"
            class="btn btn-secondary btn-sm btn-block"
            onClick={(event) => {
              event.preventDefault();
              undoClearDoneItems();
            }}
          >
            Undo cleared{" "}
            {clearedItems.length === 1
              ? "item"
              : `${clearedItems.length} items`}
          </button>
        </div>
      )}

      {db &&
        user &&
        items &&
        hasOrganizableGroups &&
        !editAction &&
        !editGroups && (
          <div class={`${style.edit_groups_action} hide-in-print`}>
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              onClick={() => {
                toggleEditGroups(true);
              }}
            >
              Organize groups &rarr;
            </button>
          </div>
        )}

      <GoBack url="/shopping" name="all lists" />
    </div>
  );
};

export default ShoppingList;

function NewItemForm({
  ready,
  // searchSuggestions,
  items,
  saveHandler,
}: {
  ready: boolean;
  items: Item[] | null;
  // searchSuggestions: SearchSuggestion[];
  saveHandler: (text: string) => void;
}) {
  const [newText, setNewText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const MAX_SUGGESTIONS = 4;

  useEffect(() => {
    if (!newText.trim()) {
      setSuggestions([]);
    } else {
      const newSuggestions: SearchSuggestion[] = [];
      const escaped = newText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rex = new RegExp(`\\b${escaped}`, "i");

      // Our hash table for avoiding dupes
      const newSuggestionsSet: Set<string> = new Set();

      if (items) {
        items.forEach((item, i) => {
          if (item.removed) {
            const normalized = stripEmojis(item.text.toLowerCase());
            if (
              rex.test(item.text) &&
              item.text.toLowerCase() !== newText.toLowerCase() &&
              !newSuggestionsSet.has(normalized)
            ) {
              newSuggestions.push({
                text: item.text,
                popularity: items.length - i,
              });
              newSuggestionsSet.add(normalized);
            }
          }
        });
      }
      if (newSuggestions.length < MAX_SUGGESTIONS) {
        // Add some brand new ones that have never been used but
        // assuming it's English we can suggest some
        ITEM_SUGGESTIONS.forEach((text) => {
          const normalized = stripEmojis(text.toLowerCase());
          if (
            rex.test(text) &&
            text.toLowerCase() !== newText.toLowerCase() &&
            !newSuggestionsSet.has(normalized)
          ) {
            newSuggestions.push({
              text,
              popularity: 0,
            });
            newSuggestionsSet.add(normalized);
          }
        });
      }

      setSuggestions(
        newSuggestions.slice(0, MAX_SUGGESTIONS).map((s) => s.text)
      );
    }
  }, [newText, items]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveHandler(newText);
        setNewText("");
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
          disabled={!ready}
        />
        <button
          type="submit"
          class="btn btn-outline-secondary"
          disabled={!newText.trim()}
        >
          Add
        </button>
      </div>

      <div class={style.search_suggestions}>
        {suggestions.length ? (
          <p>
            {suggestions.map((suggestion) => {
              return (
                <button
                  type="button"
                  class={`btn btn-sm btn-outline-secondary ${style.suggestion_button}`}
                  key={suggestion}
                  onClick={() => {
                    saveHandler(suggestion);
                    setNewText("");
                  }}
                >
                  {suggestion}?
                </button>
              );
            })}
          </p>
        ) : (
          // This min-height number I got from using the Web Inspector
          // when the p tag has buttons in it.
          <p style={{ minHeight: 31 }}>&nbsp;</p>
        )}
      </div>
    </form>
  );
}

function stripEmojis(s: string) {
  return s
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    )
    .trim();
}
