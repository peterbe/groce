import { FunctionalComponent, createRef, h } from "preact";
import { Link, route } from "preact-router";
import { useState, useEffect } from "preact/hooks";
import copy from "copy-to-clipboard";
import * as style from "./style.css";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";

import {
  FirestoreItem,
  Item,
  FirestoreInvite,
  Invite,
  List,
} from "../../types";

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

  // const [list, setList] = useState<List | null>(null);
  const list = lists ? lists.find((list) => list.id === id) : null;
  const listNotFound = lists && !list;
  const listError = lists && !list && lists.length;
  const notYourList = !list && lists;
  // const [listNotFound, setListNotFound] = useState(false);
  // const [listError, setListError] = useState<Error | null>(null);

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

  // useEffect(() => {
  //   if (db && user && id) {
  //     db.collection("shoppinglists")
  //       .doc(id)
  //       .onSnapshot(
  //         (snapshot) => {
  //           if (snapshot.exists) {
  //             const data = snapshot.data() as FirestoreList;
  //             setList({
  //               id: snapshot.id,
  //               name: data.name,
  //               notes: data.notes,
  //               order: data.order,
  //             });
  //           } else {
  //             setListNotFound(true);
  //           }
  //         },
  //         (error) => {
  //           console.error("Error getting document:", error);
  //           setListError(error);
  //         }
  //       );
  //   }
  // }, [db, user, id]);

  useEffect(() => {
    let listDbRef: () => void;
    if (list) {
      listDbRef = db
        .collection(`shoppinglists/${id}/items`)
        .where("removed", "==", false)
        .onSnapshot(
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

  async function addNewText() {
    if (!newText.trim()) {
      throw new Error("new text empty");
    }
    if (items) {
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
            text: newText.trim(),
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
              disabled={!items}
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

      {!items && (
        <div>
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

      {items && !items.length && (
        <p class={style.empty_list}>List is empty at the moment.</p>
      )}

      {!editAction && items && (
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

      {!editAction && items && (
        <ul class="list-group">
          {items.map((item) => {
            return (
              <ListItem
                key={item.id}
                item={item}
                items={items}
                toggleDone={updateItemDoneToggle}
                updateItem={updateItem}
              />
            );
          })}
        </ul>
      )}

      {!editAction && items && items.length ? (
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

      <GoBack />
    </div>
  );
};

export default ShoppingList;

function ListItem({
  item,
  items,
  toggleDone,
  updateItem,
}: {
  item: Item;
  items: Item[];
  toggleDone: (item: Item) => void;
  updateItem: (
    item: Item,

    text: string,
    description: string,
    group: string
  ) => void;
}) {
  const [text, setText] = useState(item.text);
  const [description, setDescription] = useState(item.description);
  const [group, setGroup] = useState(item.group.text);
  const [editMode, setEditMode] = useState(false);

  const textInputRef = createRef();
  useEffect(() => {
    if (editMode && textInputRef.current) {
      (textInputRef.current as HTMLInputElement).focus();
    }
  }, [editMode]);

  const groupOptionsUnique = new Set(
    items.filter((item) => item.group.text).map((item) => item.group.text)
  );
  const groupOptions: string[] = Array.from(groupOptionsUnique);
  groupOptions.sort();

  if (editMode) {
    return (
      <li class="list-group-item">
        <form
          class="mb-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) {
              return;
            }
            updateItem(item, text, description, group);
            setEditMode(false);
          }}
        >
          <div class="mb-2">
            <input
              type="text"
              class="form-control"
              ref={textInputRef}
              value={text}
              onInput={({
                currentTarget,
              }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                setText(currentTarget.value);
              }}
            />
          </div>
          <div class="mb-2">
            <textarea
              class="form-control"
              id="exampleFormControlTextarea1"
              placeholder="Description"
              value={description}
              onInput={({
                currentTarget,
              }: h.JSX.TargetedEvent<HTMLTextAreaElement, Event>) => {
                setDescription(currentTarget.value);
              }}
              rows={3}
            ></textarea>
          </div>

          <div class="mb-2">
            <input
              class="form-control"
              list="datalistOptions"
              placeholder="Group"
              value={group}
              onInput={({
                currentTarget,
              }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                setGroup(currentTarget.value);
              }}
            />
            <datalist id="datalistOptions">
              {groupOptions.map((value) => {
                return <option key={value} value={value} />;
              })}
            </datalist>
          </div>
          <div class="mb-2">
            <button
              type="submit"
              class="btn btn-primary"
              disabled={!text.trim()}
            >
              Save changes
            </button>{" "}
            <button
              type="button"
              class="btn btn-secondary"
              onClick={() => {
                setEditMode(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }
  return (
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <span>
        <input
          class="form-check-input mr-1"
          id={`checkbox${item.id}`}
          type="checkbox"
          checked={item.done}
          onClick={() => {
            toggleDone(item);
          }}
          aria-label={item.text}
        />{" "}
        {/* <label htmlFor={`checkbox${item.id}`}>{item.text}</label> */}
        <span
          class={item.done ? style.done_item : undefined}
          onClick={() => {
            setEditMode(true);
          }}
        >
          {item.text}
        </span>
      </span>

      <span
        class={
          item.group.text ? "badge bg-secondary" : "badge bg-light text-dark"
        }
        onClick={() => {
          setEditMode(true);
        }}
      >
        {item.group.text || "no group"}
      </span>
    </li>
  );
}

function ListOptions({
  db,
  list,
  close,
  user,
}: {
  db: firebase.firestore.Firestore;
  list: List;
  user: firebase.User;
  close: () => void;
}) {
  const [name, setName] = useState(list.name);
  const [notes, setNotes] = useState(list.notes);
  const [updateError, setUpdateError] = useState<Error | null>(null);
  const [confirmDelete, toggleConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  return (
    <div class={style.listoptions}>
      <form
        class={style.listoptions_section}
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
              close();
            })
            .catch((error) => {
              setUpdateError(error);
            });
        }}
      >
        <h4>List details</h4>
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
      </form>

      <div class={style.listoptions_section}>
        <h4>Share list (invite co-owners)</h4>
        <InvitesForm db={db} list={list} user={user} />
      </div>

      <div class={style.listoptions_section}>
        <h4>Delete list</h4>
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
      </div>
    </div>
  );
}

function InvitesForm({
  list,
  db,
  user,
}: {
  list: List;
  db: firebase.firestore.Firestore;
  user: firebase.User;
}) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [invitesError, setInvitesError] = useState<Error | null>(null);

  // const [showShare, setShowShare] = useState(!!navigator.share || true);
  const showShare = !!navigator.share;
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (copied) {
      setTimeout(() => {
        if (mounted) {
          setCopied(false);
        }
      }, 3 * 1000);
    }
    return () => {
      mounted = false;
    };
  }, [copied]);

  useEffect(() => {
    let mounted = true;
    if (shared) {
      setTimeout(() => {
        if (mounted) {
          setShared(false);
        }
      }, 10 * 1000);
    }
    return () => {
      mounted = false;
    };
  }, [shared]);

  useEffect(() => {
    const ref = db
      .collection("invites")
      .where("inviter_uid", "==", user.uid)
      .where("list", "==", list.id)
      .onSnapshot(
        (snapshot) => {
          const newInvites: Invite[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreInvite;
            // If it has expired, delete it immediately
            if (data.expires.toDate() < new Date()) {
              // Expired!
              deleteInvite(doc.id);
            } else {
              newInvites.push({
                id: doc.id,
                list: data.list,
                email: data.email,
                added: data.added,
                expires: data.expires,
                about: data.about,
                inviter_uid: data.inviter_uid,
              });
            }
          });
          setInvites(newInvites);
        },
        (error) => {
          console.log("Error on snapshot", error);
          setInvitesError(error);
        }
      );
    return () => {
      if (ref) {
        ref();
      }
    };
  }, [db, list]);

  const [deleteError, setDeleteError] = useState<Error | null>(null);

  function deleteInvite(inviteID: string) {
    db.collection("invites")
      .doc(inviteID)
      .delete()
      .then(() => {
        console.log("Document successfully deleted!");
      })
      .catch((error) => {
        console.error("Error removing document: ", error);
        setDeleteError(error);
      });
  }

  async function generateInviteLink() {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 30);
    await db.collection("invites").add({
      inviter_uid: user.uid,
      inviter_name: user.displayName,
      added: firebase.firestore.Timestamp.fromDate(now),
      expires: firebase.firestore.Timestamp.fromDate(future),
      list: list.id,
      about: {
        name: list.name,
        notes: list.notes,
        inviter: user.displayName,
      },
    });
  }
  if (deleteError) {
    return (
      <Alert
        heading="Invite couldn't be deleted"
        message={deleteError.toString()}
      />
    );
  }

  return (
    <form>
      <div class="mb-3">
        {invites && !invites.length && (
          <p>
            <button
              type="button"
              class="btn btn-info"
              onClick={async () => {
                await generateInviteLink();
              }}
            >
              Generate new invite
            </button>
          </p>
        )}

        {invites && invites.length ? (
          <div>
            {invites.map((invite) => {
              const inviteURL = `/invited/${invite.id}`;
              const loc = window.location;
              const absoluteInviteURL = `${loc.protocol}//${loc.host}${inviteURL}`;

              return (
                <div class="card" key={invite.id}>
                  <div class="card-header">Invite</div>
                  <div class="card-body">
                    <h5 class="card-title">
                      <a href={inviteURL}>
                        <code>{absoluteInviteURL}</code>
                      </a>
                    </h5>
                    <p class="card-text">
                      Expires: {invite.expires.toDate().toLocaleDateString()}
                    </p>
                    {shareError && (
                      <p style={{ color: "red" }}>
                        <b>Share error:</b> <code>{shareError.toString()}</code>
                      </p>
                    )}
                    {showShare && (
                      <button
                        type="button"
                        class="btn btn-info"
                        onClick={() => {
                          const shareData = {
                            title: list.name,
                            text: user?.displayName
                              ? `Shopping list (${list.name}) shared by ${user.displayName}`
                              : `Shopping list (${list.name})`,
                            url: absoluteInviteURL,
                          };
                          setShareError(null);
                          try {
                            navigator
                              .share(shareData)
                              .then(() => {
                                setShared(true);
                                setShareError(null);
                              })
                              .catch((e) => {
                                setShareError(e);
                              });
                          } catch (error) {
                            console.error(
                              "Error trying to navigator.share",
                              error
                            );
                            setShareError(error);
                          }
                        }}
                      >
                        Web Share (recommended)
                      </button>
                    )}{" "}
                    <button
                      type="button"
                      class="btn btn-info"
                      onClick={() => {
                        copy(absoluteInviteURL);
                        setCopied(true);
                      }}
                    >
                      {copied ? "Copied to clipboard" : "Copy link"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {invites && !invites.length && (
          <p>
            <i>You have no current invites to this list</i>
          </p>
        )}

        {invitesError && (
          <Alert
            heading="Error getting list of invites"
            message={invitesError.toString()}
          />
        )}
      </div>
    </form>
  );
}
