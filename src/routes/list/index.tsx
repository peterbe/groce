import { FunctionalComponent, h, Fragment } from "preact";
import { Link } from "preact-router";
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
import { NewItemForm } from "./new-item-form";
import { PopularityContest } from "./popularity-contest";
import { GROUP_SUGGESTIONS } from "./default-suggestions";
import { FirestoreItem, Item, List, StorageSpec } from "../../types";
import { stripEmojis } from "../../utils";

interface Props {
  user: firebase.User | false | null;
  db: firebase.firestore.Firestore | null;
  storage: firebase.storage.Storage | null;
  id: string;
  lists: List[] | null;
}

const ShoppingList: FunctionalComponent<Props> = ({
  user,
  db,
  storage,
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
  const [popularityContest, setPopularityContest] = useState(false);

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
            const item = {
              id: doc.id,
              text: data.text,
              description: data.description,
              done: data.done,
              group: data.group,
              quantity: data.quantity || 0,
              removed: data.removed,
              added: data.added,
              times_added: data.times_added || 1,
              images: data.images || [],
            };
            newItems.push(item);
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
              // console.log("RECENTLY UPDATED", change.doc.data().text);
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
  }, [id, list, user, db, storage]);

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
          console.log("Undo all items cleared");
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
    const textLC = text.toLowerCase();
    // The comparison using `stripEmojis()` is in case you have a previous
    // item like "Bananas 🍌" and this time you just typed "bananas", then
    // match that one.
    const previousItem = items.find(
      (item) =>
        item.text.toLowerCase() === textLC ||
        stripEmojis(item.text).toLowerCase() === textLC
    );

    if (previousItem) {
      // Update it as not removed and not done
      db.collection(`shoppinglists/${id}/items`)
        .doc(previousItem.id)
        .set({
          text: previousItem.text,
          description: "",
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
      const collectionRef = db.collection(`shoppinglists/${id}/items`);
      const itemRef = collectionRef.doc(item.id);

      const normalizeGroupText = (s: string) => stripEmojis(s).toLowerCase();
      const thisGroup = normalizeGroupText(group.trim());

      let groupOrder = 0;
      if (group.trim() && items) {
        // Seek the highest group order of any item that matches this.
        groupOrder = Math.max(
          ...items
            .filter(
              (item) =>
                item.group.text &&
                normalizeGroupText(item.group.text) === thisGroup
            )
            .map((item) => item.group.order)
        );
      }
      const groupText = group.trim();
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
          // console.log("Updated", item.id);

          if (items && groupItem.text) {
            // If the groupItem.text was changed, make sure all the other
            // items' groupItem.text reflects that.
            console.log({ GROUP: groupItem.text });
            const correctGroupText = groupItem.text;

            const normalizedGroupText = normalizeGroupText(groupItem.text);
            const relatedItems = items.filter((relatedItem) => {
              return (
                relatedItem.id !== item.id &&
                relatedItem.group.text &&
                relatedItem.group.text !== correctGroupText &&
                normalizeGroupText(relatedItem.group.text) ===
                  normalizedGroupText
              );
            });
            if (relatedItems.length) {
              const batch = db.batch();
              relatedItems.forEach((relatedItem) => {
                const itemDoc = collectionRef.doc(relatedItem.id);
                batch.update(itemDoc, {
                  group: {
                    text: correctGroupText,
                    order: groupOrder,
                  },
                });
              });
              batch
                .commit()
                .then(() => {
                  console.log(
                    `Correct group on ${relatedItems.length} other items`
                  );
                })
                .catch((error) => {
                  console.error("Error doing batch operation", error);
                });
            }
          }
        })
        .catch((error) => {
          // XXX Deal with this better.
          console.error(`Error trying to update item ${item.id}:`, error);
        });
    }
  }

  function updateItemImage(item: Item, spec: StorageSpec) {
    if (db) {
      let operation: firebase.firestore.FieldValue;
      if (spec.add) {
        operation = firebase.firestore.FieldValue.arrayUnion(spec.add);
      } else if (spec.remove) {
        operation = firebase.firestore.FieldValue.arrayRemove(spec.remove);
      } else {
        throw new Error("Invalid spec!");
      }
      if (db) {
        const itemRef = db.collection(`shoppinglists/${id}/items`).doc(item.id);
        itemRef
          .update({
            images: operation,
          })
          .then(() => {
            if (spec.remove && storage) {
              // Create a reference to the file to delete
              const storageRef = storage.ref();
              storageRef
                .child(spec.remove)
                .delete()
                .then(() => {
                  // TODO: Delete all the thumbnails too some day.
                })
                .catch((error) => {
                  console.log("Unknown error deleting image", error);
                });
            }
          })
          .catch((error) => {
            // XXX Deal with this better.
            console.error(`Error trying to update item ${item.id}:`, error);
          });
      }
    }
  }

  const [modalImageURL, setModalImageURL] = useState("");
  function openImageModal(url: string) {
    setModalImageURL(url);
  }
  function closeImageModal() {
    setModalImageURL("");
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

      {items && !editAction && popularityContest && (
        <PopularityContest
          // db={db}
          // user={user}
          // list={list}
          items={items}
          close={() => {
            setPopularityContest(false);
          }}
        />
      )}

      {db && user && list && editAction && (
        <ListOptions
          db={db}
          user={user}
          list={list}
          togglePopularityContest={() => {
            toggleEditAction(false);
            setPopularityContest(true);
          }}
          close={() => {
            toggleEditAction(false);
          }}
        />
      )}

      {db &&
        items &&
        list &&
        !editAction &&
        !popularityContest &&
        editGroups &&
        hasOrganizableGroups && (
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

      {!editAction && !editGroups && !popularityContest && (
        <NewItemForm
          ready={!!items}
          items={items}
          saveHandler={(text: string) => {
            addNewText(text);
          }}
          disableDefaultSuggestions={!!list?.config.disableDefaultSuggestions}
        />
      )}

      {!items && <Loading text="Loading shopping list..." />}

      {items &&
        !editAction &&
        !editGroups &&
        !popularityContest &&
        !todoItems.length &&
        !doneItems.length && (
          <p class={style.empty_list}>List is empty at the moment.</p>
        )}

      {list &&
        !editAction &&
        !editGroups &&
        !popularityContest &&
        !!todoItems.length && (
          <ul class="list-group shadow-sm bg-white rounded">
            {todoItems
              .filter((item) => !item.done)
              .map((item) => {
                return (
                  <ListItem
                    key={item.id}
                    item={item}
                    list={list}
                    db={db}
                    storage={storage}
                    modified={recentlyModifiedItems.get(item.id) || null}
                    groupOptions={groupOptions}
                    disableGroups={list ? list.config.disableGroups : false}
                    disableQuantity={list ? list.config.disableQuantity : false}
                    toggleDone={updateItemDoneToggle}
                    updateItem={updateItem}
                    updateItemImage={updateItemImage}
                    openImageModal={openImageModal}
                  />
                );
              })}
          </ul>
        )}
      {list &&
        !editAction &&
        !editGroups &&
        !popularityContest &&
        !!doneItems.length && (
          <div class={style.done_items}>
            <h5>Done and dusted</h5>
            <ul class="list-group shadow-sm bg-white rounded">
              {doneItems
                .filter((item) => item.done)
                .map((item) => {
                  return (
                    <ListItem
                      key={item.id}
                      item={item}
                      list={list}
                      db={db}
                      storage={storage}
                      modified={recentlyModifiedItems.get(item.id) || null}
                      groupOptions={groupOptions}
                      disableGroups={list ? list.config.disableGroups : false}
                      disableQuantity={
                        list ? list.config.disableQuantity : false
                      }
                      toggleDone={updateItemDoneToggle}
                      updateItem={updateItem}
                      updateItemImage={updateItemImage}
                      openImageModal={openImageModal}
                    />
                  );
                })}
            </ul>
          </div>
        )}

      {!editAction &&
      !editGroups &&
      !popularityContest &&
      !!doneItems.length ? (
        <div class={`${style.clearitems} d-grid gap-2`}>
          <button
            type="button"
            class="btn btn-success btn-lg"
            onClick={(event) => {
              event.preventDefault();
              clearDoneItems();
            }}
          >
            Clear done items
          </button>
        </div>
      ) : null}

      {!editAction &&
        !editGroups &&
        !popularityContest &&
        !!clearedItems.length && (
          <div class={`${style.clearitems} d-grid gap-2`}>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
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
        !popularityContest &&
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

      {db && user && user.isAnonymous && (
        <div class={`${style.sign_in_reminder} text-right`}>
          <Link href="/signin" class="btn btn-sm btn-outline-primary">
            Sign in to not lose your list &rarr;
          </Link>
        </div>
      )}

      <GoBack url="/shopping" name="lists" />

      <ImageModal url={modalImageURL} close={closeImageModal} />
    </div>
  );
};

export default ShoppingList;

function ImageModal({ url, close }: { url: string; close: () => void }) {
  function keydownHandler(event: KeyboardEvent) {
    console.log(event);

    if (event.code === "Escape") {
      close();
    }
  }
  useEffect(() => {
    if (url) {
      document.body.classList.add("modal-open");
      document.addEventListener("keydown", keydownHandler);
    } else {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", keydownHandler);
    }
    return () => {
      document.removeEventListener("keydown", keydownHandler);
    };
  }, [url]);
  if (!url) {
    return null;
  }
  return (
    <Fragment>
      <div
        class="modal fade show"
        // id="exampleModal"
        tabIndex={-1}
        style={{ display: "block" }}
        // aria-labelledby="exampleModalLabel"
        // aria-hidden="true"
        role="dialog"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              {/* <h5 class="modal-title" id="exampleModalLabel">
              Modal title
            </h5> */}
              <button
                type="button"
                class="btn-close"
                data-dismiss="modal"
                aria-label="Close"
                onClick={() => close()}
              ></button>
            </div>
            <div class="modal-body">
              <img src={url} style={{ maxWidth: "100%" }} />
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                data-dismiss="modal"
                onClick={() => close()}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </Fragment>
  );
}
