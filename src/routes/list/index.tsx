import { FunctionalComponent, JSX, h } from "preact";
import { Link, route } from "preact-router";
import { useState, useEffect } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";
import { FirestoreItem, Item, FirestoreList, List } from "../../types";

interface Props {
  user: firebase.User | null;
  db: firebase.firestore.Firestore | null;
  id: string;
}
const ShoppingList: FunctionalComponent<Props> = ({ user, db, id }: Props) => {
  const [items, setItems] = useState<Item[] | null>(null);

  const [list, setList] = useState<List | null>(null);
  const [listNotFound, setListNotFound] = useState(false);
  const [listError, setListError] = useState<Error | null>(null);
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
          .filter((item) => item.removed && rex.test(item.text))
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
    if (db && user && id) {
      // db.collection("shoppinglists")
      //   .doc(id)
      //   .get()
      //   .then((doc) => {
      //     if (doc.exists) {
      //       const data = doc.data() as FirestoreList;
      //       setList({
      //         id: doc.id,
      //         name: data.name,
      //         notes: data.notes,
      //         order: data.order,
      //       });
      //     } else {
      //       setListNotFound(true);
      //     }
      //   })
      //   .catch((error) => {
      //     console.error("Error getting document:", error);
      //     setListError(error);
      //   });
      db.collection("shoppinglists")
        .doc(id)
        .onSnapshot(
          (snapshot) => {
            if (snapshot.exists) {
              const data = snapshot.data() as FirestoreList;
              setList({
                id: snapshot.id,
                name: data.name,
                notes: data.notes,
                order: data.order,
              });
            } else {
              setListNotFound(true);
            }
          },
          (error) => {
            console.error("Error getting document:", error);
            setListError(error);
          }
        );
    }
  }, [db, user, id]);

  useEffect(() => {
    let listDbRef: () => void;
    if (user && db && list) {
      listDbRef = db
        .collection(`shoppinglists/${id}/items`)
        .where("removed", "==", false)
        .onSnapshot(
          (snapshot) => {
            const newItems: Item[] = [];
            snapshot.forEach((doc) => {
              // doc.data() is never undefined for query doc snapshots
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

            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                console.log("Added: ", change.doc.data());
              }
              if (change.type === "modified") {
                console.log("Modified city: ", change.doc.data());
              }
              if (change.type === "removed") {
                console.log("Removed city: ", change.doc.data());
              }
            });
            newItems.sort((a, b) => {
              if (a.done && !b.done) {
                return 1;
              } else if (!a.done && b.done) {
                return -1;
              } else {
                return a.group.order - b.group.order;
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

  async function updateItemDoneToggle(item: Item) {
    if (db) {
      try {
        await db.collection(`shoppinglists/${id}/items`).doc(item.id).update({
          done: !item.done,
        });
      } catch (error) {
        console.error("Unable to update:", error);
      }
    } else {
      console.warn("DB not available");
    }
  }

  function clearDoneItems() {
    if (db && items) {
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

  async function addNewText() {
    if (!newText.trim()) {
      throw new Error("new text empty");
    }
    if (db && items) {
      // If the exact same text has been used before, reuse it
      const previousItem = items.find(
        (item) => item.text.toLowerCase() === newText.toLowerCase()
      );
      if (previousItem) {
        // Update it as not removed and not done
        try {
          await db
            .collection(`shoppinglists/${id}/items`)
            .doc(previousItem.id)
            .set({
              text: newText.trim(),
              description: previousItem.description,
              group: previousItem.group,
              done: false,
              removed: false,
              added: firebase.firestore.Timestamp.fromDate(new Date()),
            });
          setNewText("");
          setNewDescription("");
        } catch (error) {
          console.error("Unable to update:", error);
          throw error;
        }
      } else {
        // A fresh add
        try {
          await db.collection(`shoppinglists/${id}/items`).add({
            text: newText.trim(),
            description: newDescription.trim(),
            group: {
              order: 0,
              text: "",
            },
            done: false,
            removed: false,
            added: firebase.firestore.Timestamp.fromDate(new Date()),
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

  if (listNotFound) {
    return (
      <Alert
        heading={"Shopping list not found"}
        message={
          <p>
            No list by the ID <code>{id}</code>
          </p>
        }
      />
    );
  }
  if (listError) {
    return (
      <Alert
        heading={"List error"}
        message={
          <p>
            List error: <code>{listError.toString()}</code>{" "}
          </p>
        }
      />
    );
  }

  return (
    <div class={style.list}>
      <div class="container">
        <p class={style.editaction}>
          <button
            type="button"
            class={editAction ? "btn btn-sm btn-info" : "btn btn-sm"}
            onClick={() => {
              toggleEditAction(!editAction);
            }}
          >
            {editAction ? "Close" : "Modify list"}
          </button>
        </p>
        {list && (
          <h2>
            {list.name}{" "}
            {list.notes && <small class="text-muted">{list.notes}</small>}
          </h2>
        )}
        {db && list && editAction && (
          <EditListForm
            db={db}
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
        {items && !editAction && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await addNewText();
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
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                disabled={!newText.trim()}
                onClick={addNewText}
              >
                Add
              </button>
            </div>
          </form>
        )}

        {items && (
          <div>
            {searchSuggestions.length ? (
              <p>
                {searchSuggestions.map((suggestion) => {
                  return (
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      key={suggestion}
                      style={{ marginRight: 5 }}
                      onClick={() => {
                        setNewText(suggestion);
                      }}
                    >
                      {suggestion}
                    </button>
                  );
                })}
                ?
              </p>
            ) : (
              <p>&nbsp;</p>
            )}
          </div>
        )}

        {/* COnsider this format instead:
            https://v5.getbootstrap.com/docs/5.0/forms/input-group/#checkboxes-and-radios */}
        {items && (
          <ul class="list-group">
            {items.map((item) => {
              return (
                <li class="list-group-item" key={item.id}>
                  <input
                    class="form-check-input mr-1"
                    id={`checkbox${item.id}`}
                    type="checkbox"
                    checked={item.done}
                    onClick={async () => {
                      await updateItemDoneToggle(item);
                    }}
                    aria-label="..."
                  />
                  <label htmlFor={`checkbox${item.id}`}>{item.text}</label>
                </li>
              );
            })}
          </ul>
        )}

        {items && items.length ? (
          <div class={style.clearitems}>
            <button
              type="button"
              class="btn btn-info btn-lg btn-block"
              disabled={!items.filter((item) => item.done).length}
              onClick={(event) => {
                event.preventDefault();
                clearDoneItems();
              }}
            >
              Clear done items
            </button>
          </div>
        ) : null}

        <div class={style.goback}>
          <Link href="/shopping" class="btn btn-outline-primary">
            &larr; Back to shopping lists
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;

function Alert({
  heading,
  message,
}: {
  heading: string;
  message: string | JSX.Element;
}) {
  return (
    <div class={style.list}>
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">{heading}</h4>
        {message}
        <hr />
        <p class="mb-0">
          <Link href="/shopping">
            Go back to list of <b>shopping lists</b> to try again
          </Link>
        </p>
      </div>
    </div>
  );
}

function EditListForm({
  db,
  list,
  close,
}: {
  db: firebase.firestore.Firestore;
  list: List;
  close: () => void;
}) {
  const [name, setName] = useState(list.name);
  const [notes, setNotes] = useState(list.notes);
  const [updateError, setUpdateError] = useState<Error | null>(null);
  const [confirmDelete, toggleConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        const doc = db.collection("shoppinglists").doc(list.id);
        doc
          .update({
            name: name.trim(),
            notes: notes.trim(),
          })
          .then(() => {
            console.log("HAVE UPDATED");
            close();
          })
          .catch((error) => {
            console.error("FAILED TO UPDATE", error);
            setUpdateError(error);
          });
      }}
    >
      {updateError && (
        <Alert heading="Update error" message={updateError.toString()} />
      )}
      <div class="mb-3">
        <label htmlFor="id_list_name" class="form-label">
          Name
        </label>
        <input
          type="text"
          class="form-control"
          id="id_list_name"
          required
          value={name}
          onInput={({
            currentTarget,
          }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
            setName(currentTarget.value);
          }}
          aria-label="List's name"
        />
        <div class="invalid-feedback">Must have a name</div>
      </div>
      <div class="mb-3">
        <label htmlFor="id_list_notes" class="form-label">
          Notes
        </label>
        <input
          type="text"
          class="form-control"
          id="id_list_notes"
          value={notes}
          onInput={({
            currentTarget,
          }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
            setNotes(currentTarget.value);
          }}
          aria-label="List's notes"
          aria-describedby="notesHelp"
        />

        <div id="notesHelp" class="form-text">
          Optional
        </div>
      </div>
      <div class="mb-3">
        <button type="submit" class="btn btn-primary" disabled={!name.trim()}>
          Save changes
        </button>{" "}
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => {
            close();
          }}
        >
          Cancel
        </button>
      </div>
      <div class="mb-3">
        <button
          type="button"
          class="btn btn-warning"
          onClick={() => {
            toggleConfirmDelete(!confirmDelete);
          }}
        >
          {confirmDelete ? "Cancel" : "Delete list"}
        </button>
      </div>
      {confirmDelete && (
        <div class="mb-3">
          <h4>Are you sure?</h4>
          <p>This can&apos;t be undone</p>
          <button
            type="button"
            class="btn btn-danger"
            onClick={() => {
              const doc = db.collection("shoppinglists").doc(list.id);

              doc
                .delete()
                .then(() => {
                  close();
                  route("/shopping", true);
                })
                .catch((error) => {
                  console.error("Unable to delete list:", error);
                  setDeleteError(error);
                });
            }}
          >
            Yes, delete this list
          </button>
        </div>
      )}
      {deleteError && (
        <Alert
          heading="Unable to delete list"
          message={deleteError.toString()}
        />
      )}
    </form>
  );
}
