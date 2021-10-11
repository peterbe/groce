import { h } from "preact";
import { Link } from "preact-router";
import { useState, useEffect, useRef } from "preact/hooks";
import style from "./style.css";
import { User } from "firebase/auth";
import {
  doc,
  Firestore,
  onSnapshot,
  Unsubscribe,
  collection,
  addDoc,
  query,
  Timestamp,
  writeBatch,
  updateDoc,
  deleteDoc,
  FieldValue,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { FirebaseStorage } from "firebase/storage";

import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { Loading } from "../../components/loading";
import { OfflineWarning } from "../../components/offline-warning";
import { ListOptions } from "./list-options";
import { OrganizeGroups } from "./organize-groups";
import { ListItem } from "./list-item";
import { NewItemForm } from "./new-item-form";
import { Pictures } from "./pictures";
import { PopularityContest } from "./popularity-contest";
import { GROUP_SUGGESTIONS, ITEM_SUGGESTIONS } from "./default-suggestions";
import { FirestoreItem, Item, List, StorageSpec } from "../../types";
import { stripEmojis } from "../../utils";
import { ImageModal } from "../../components/image-modal";

function ShoppingList({
  user,
  db,
  storage,
  id,
  lists,
  photosMode,
}: {
  user: User | false | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  id: string;
  lists: List[] | null;
  photosMode: boolean;
}): h.JSX.Element {
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
    let unsubscribe: null | Unsubscribe = null;
    if (db && list) {
      const collectionRef = collection(db, `shoppinglists/${id}/items`);
      unsubscribe = onSnapshot(
        query(collectionRef),
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
              imagesThumbnailData: data.imagesThumbnailData,
            };
            newItems.push(item);
          });

          newItems.sort((a, b) => {
            if (a.done && !b.done) {
              return 1;
            } else if (!a.done && b.done) {
              return -1;
            } else if (a.done && b.done) {
              // For legacy, some old items might be boolean "true" here
              // and not a date.
              const aDate = (typeof a.done === "boolean" ? a.added[0] : a.done)
                .seconds;
              const bDate = (typeof b.done === "boolean" ? b.added[0] : b.done)
                .seconds;
              // descending order. Most recently done first.
              return bDate - aDate;
            }
            if (a.group.order !== b.group.order) {
              return a.group.order - b.group.order;
            }
            // Descending order. More recent additions on top.
            return b.added[0].seconds - a.added[0].seconds;
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
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // }, [id, list, user, db, storage]);
  }, [id, list, user, db]); // XXX ARE ALL OF THESE NEEDED!

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

  async function clearDoneItems() {
    if (db && items) {
      // try {
      //   await runTransaction(db, async (transaction) => {
      //     const sfDoc = await transaction.get(sfDocRef);
      //     if (!sfDoc.exists()) {
      //       throw "Document does not exist!";
      //     }

      //     const newPopulation = sfDoc.data().population + 1;
      //     transaction.update(sfDocRef, { population: newPopulation });
      //   });
      //   console.log("Transaction successfully committed!");
      // } catch (e) {
      //   console.log("Transaction failed: ", e);
      // }

      // try {
      // const collectionRef = collection(db, `shoppinglists/${id}/items`);
      //   const itemsDoc

      // } catch (error) {
      //   console.log("Transaction failed: ", error);
      //   // XXX DEAL WITH THIS BETTER

      // }
      const cleared: Item[] = [];
      const batch = writeBatch(db);
      items
        .filter((item) => item.done && !item.removed)
        .forEach((item) => {
          const itemRef = doc(db, `shoppinglists/${id}/items`, item.id);
          batch.update(itemRef, {
            removed: Timestamp.fromDate(new Date()),
          });
          cleared.push(item);
        });
      try {
        await batch.commit();
      } catch (error) {
        console.error("Error doing batch operation", error);
        // XXX Deal with this!
        return;
      }
      setClearedItems(cleared);

      // const collectionRef = db.collection(`shoppinglists/${id}/items`);
      // const batch = db.batch();
      // items
      //   .filter((item) => item.done && !item.removed)
      //   .forEach((item) => {
      //     const itemDoc = collectionRef.doc(item.id);
      //     batch.update(itemDoc, {
      //       removed: Timestamp.fromDate(new Date()),
      //     });
      //     cleared.push(item);
      //   });

      // batch
      //   .commit()
      //   .then(() => {
      //     console.log("All items cleared");
      //   })
      //   .catch((error) => {
      //     console.error("Error doing batch operation", error);
      //     // XXX Deal with this!
      //   });
      // setClearedItems(cleared);
    }
  }

  async function undoClearDoneItems() {
    if (db && items) {
      // const collectionRef = db.collection(`shoppinglists/${id}/items`);
      // const batch = db.batch();
      const batch = writeBatch(db);
      clearedItems.forEach((item) => {
        // const itemRef = doc(db, "cities", "SF");
        const itemRef = doc(db, `shoppinglists/${id}/items`, item.id);
        batch.update(itemRef, {
          removed: false,
        });
        // const itemDoc = collectionRef.doc(item.id);
        // // console.log(item);
        // batch.update(itemDoc, {
        //   removed: false,
        // });
      });

      try {
        await batch.commit();
      } catch (error) {
        console.error("Error doing batch operation", error);
        // XXX Deal with this!
        return;
      }
      setClearedItems([]);
      // batch
      //   .commit()
      //   .then(() => {
      //     console.log("Undo all items cleared");
      //   })
      //   .catch((error) => {
      //     console.error("Error doing batch operation", error);
      //     // XXX Deal with this!
      //   });
      // setClearedItems([]);
    }
  }

  async function addNewText(text: string) {
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

      await updateDoc(doc(db, `shoppinglists/${id}/items`, previousItem.id), {
        text: previousItem.text,
        description: "",
        group: previousItem.group,
        images: previousItem.images || [],
        quantity: 0,
        done: false,
        removed: false,
        added: [Timestamp.fromDate(new Date()), ...previousItem.added],
        times_added: (previousItem.times_added || 1) + 1,
      });
      return;
    }
    if (!list?.config.disableDefaultSuggestions) {
      // Perhaps what you typed was almost like one of the suggestions.
      // E.g you typed 'steak' but there's a suggestion, which is spelled
      // "nicer" and it's 'Steak 🥩'
      const suggestion = ITEM_SUGGESTIONS.find(
        (itemText) =>
          itemText.toLowerCase() === textLC ||
          stripEmojis(itemText).toLowerCase() === textLC
      );
      if (suggestion) {
        text = suggestion;
      }
    }

    // A fresh add
    const collectionRef = collection(db, `shoppinglists/${id}/items`);
    await addDoc(collectionRef, {
      text: text.trim(),
      description: "",
      group: {
        order: 0,
        text: "",
      },
      quantity: 0,
      done: false,
      removed: false,
      added: [Timestamp.fromDate(new Date())],
      times_added: 1,
    });
    // .catch((error) => {
    //   console.error("Error trying to add new item:", error);
    //   throw error;
    // });
  }

  async function updateItemDoneToggle(item: Item) {
    if (!db) {
      return;
    }
    await updateDoc(doc(db, `shoppinglists/${id}/items`, item.id), {
      done: item.done ? false : Timestamp.fromDate(new Date()),
    });
  }

  async function deleteItem(item: Item) {
    if (!db) {
      return;
    }
    await deleteDoc(doc(db, `shoppinglists/${id}/items`, item.id));
  }

  async function updateItem(
    item: Item,
    text: string,
    description: string,
    group: string,
    quantity: number
  ) {
    if (!db) {
      return;
    }

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

    await updateDoc(doc(db, `shoppinglists/${id}/items`, item.id), {
      text: text.trim(),
      description: description.trim(),
      group: groupItem,
      quantity,
    });

    if (items && groupItem.text) {
      // If the groupItem.text was changed, make sure all the other
      // items' groupItem.text reflects that.
      const correctGroupText = groupItem.text;

      const normalizedGroupText = normalizeGroupText(groupItem.text);
      const relatedItems = items.filter((relatedItem) => {
        return (
          relatedItem.id !== item.id &&
          relatedItem.group.text &&
          relatedItem.group.text !== correctGroupText &&
          normalizeGroupText(relatedItem.group.text) === normalizedGroupText
        );
      });
      if (relatedItems.length) {
        const batch = writeBatch(db);
        relatedItems.forEach((relatedItem) => {
          const itemRef = doc(db, `shoppinglists/${id}/items`, relatedItem.id);
          batch.update(itemRef, {
            group: {
              text: correctGroupText,
              order: groupOrder,
            },
          });
        });
        try {
          await batch.commit();
        } catch (error) {
          console.error("Error doing batch operation", error);
          // XXX Deal with this!
          return;
        }
      }
    }
  }

  async function updateItemImage(item: Item, spec: StorageSpec) {
    if (!db) {
      return;
    }

    let operation: FieldValue;
    if (spec.add) {
      operation = arrayUnion(spec.add);
    } else if (spec.remove) {
      operation = arrayRemove(spec.remove);
    } else {
      throw new Error("Invalid spec!");
    }

    await updateDoc(doc(db, `shoppinglists/${id}/items`, item.id), {
      images: operation,
    });
    // Remember, there's a Cloud Function that takes care of deleting
    // the image from the storage. It notices when the shoppinglist item
    // has an image removed.
  }

  const [modalImageURL, setModalImageURL] = useState("");
  const [modalImageFile, setModalImageFile] = useState<File | undefined>();

  function openImageModal(url: string, file: File | undefined) {
    setModalImageURL(url);
    setModalImageFile(file);
  }
  function closeImageModal() {
    setModalImageURL("");
    setModalImageFile(undefined);
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

  const todoItems: Item[] = [];
  const doneItems: Item[] = [];
  const groupOptions: string[] = [];
  const groupOptionsSet: Set<string> = new Set();
  if (items) {
    todoItems.push(...items.filter((item) => !item.done && !item.removed));
    doneItems.push(...items.filter((item) => item.done && !item.removed));

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

      <p class="float-end hide-in-print">
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
          <Link class={style.list_header_link} href={`/shopping/${list.id}`}>
            {list.name}
          </Link>
        </h2>
      )}

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

      {!editAction && !editGroups && !popularityContest && !photosMode && (
        <NewItemForm
          ready={!!items}
          items={items}
          saveHandler={(text: string) => {
            addNewText(text);
          }}
          disableDefaultSuggestions={!!list?.config.disableDefaultSuggestions}
        />
      )}

      {!editAction &&
        !editGroups &&
        !popularityContest &&
        photosMode &&
        db &&
        storage &&
        user &&
        list && (
          <Pictures
            db={db}
            storage={storage}
            user={user}
            list={list}
            ready={!!items}
            items={items}
            saveHandler={async (text: string) => {
              await addNewText(text);
            }}
            openImageModal={openImageModal}
          />
        )}

      {!items && <Loading text="Loading shopping list..." minHeight={200} />}

      {items &&
        !editAction &&
        !editGroups &&
        !popularityContest &&
        !photosMode &&
        !todoItems.length &&
        !doneItems.length && (
          <p class={style.empty_list}>List is empty at the moment.</p>
        )}

      {list &&
        !editAction &&
        !editGroups &&
        !popularityContest &&
        !photosMode &&
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
                    disableFireworks={
                      list ? list.config.disableFireworks : false
                    }
                    toggleDone={updateItemDoneToggle}
                    updateItem={updateItem}
                    updateItemImage={updateItemImage}
                    openImageModal={openImageModal}
                    deleteItem={deleteItem}
                  />
                );
              })}
          </ul>
        )}
      {list &&
        !editAction &&
        !editGroups &&
        !popularityContest &&
        !photosMode &&
        !!doneItems.length && (
          <div class={style.done_items}>
            <h5>Done and dusted</h5>
            <ul class="list-group shadow-sm bg-white rounded">
              {doneItems.map((item) => {
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
                    disableFireworks={
                      list ? list.config.disableFireworks : false
                    }
                    toggleDone={updateItemDoneToggle}
                    updateItem={updateItem}
                    updateItemImage={updateItemImage}
                    openImageModal={openImageModal}
                    deleteItem={deleteItem}
                  />
                );
              })}
            </ul>
          </div>
        )}

      {!editAction &&
      !editGroups &&
      !popularityContest &&
      !photosMode &&
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
        !photosMode &&
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
        !photosMode &&
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

      {!editAction && !editGroups && !popularityContest && !photosMode && (
        <div class={style.camera_mode}>
          <Link
            href={`/shopping/${id}/photos`}
            class="btn btn-outline-secondary"
          >
            📸 Photos
          </Link>
        </div>
      )}

      {db && user && user.isAnonymous && (
        <div class={`${style.sign_in_reminder} text-right`}>
          <Link href="/signin" class="btn btn-sm btn-outline-primary">
            Sign in to not lose your list &rarr;
          </Link>
        </div>
      )}

      {photosMode ? (
        <GoBack url={`/shopping/${id}`} name="shopping list" />
      ) : (
        <GoBack url="/shopping" name="lists" />
      )}

      <ImageModal
        url={modalImageURL}
        close={closeImageModal}
        file={modalImageFile}
      />
    </div>
  );
}

export default ShoppingList;
