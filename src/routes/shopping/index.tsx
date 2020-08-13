import { FunctionalComponent, h, JSX } from "preact";
import { route } from "preact-router";
import { useState, useEffect } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { FirestoreItem, Item, List } from "../../types";

interface Props {
  user: firebase.User | false | null;
  db: firebase.firestore.Firestore | null;
  lists: List[] | null;
}

const Shopping: FunctionalComponent<Props> = ({ user, db, lists }: Props) => {
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);

  useEffect(() => {
    // if (lists && lists.length) {
    //   document.title = `(${lists.length}) Shopping lists`;
    // } else {
    document.title = "Shopping lists";
    // }
  }, []);

  async function createNewGroup(name: string, notes: string) {
    if (db && user) {
      try {
        await db.collection("shoppinglists").add({
          name,
          notes,
          owners: [user.uid],
          order:
            1 +
            ((lists && Math.max(...lists.map((list) => list.order || 0))) || 0),
        });
        setShowNewGroupModal(false);
      } catch (error) {
        console.error("Error creating shopping list:", error);
        // XXX
      }
    }
  }

  function getShoppingHref(list: List) {
    return `/shopping/${list.id}`;
  }

  // Auth as loaded and determined that the user is not signed in
  if (user === false) {
    return (
      <div class={style.shopping}>
        <Alert
          heading={"You're not signed in"}
          message={<p>Use the menu bar below to sign in first.</p>}
        />
      </div>
    );
  }

  return (
    <div class={style.shopping}>
      <h2>
        Shopping lists{" "}
        {lists && lists.length ? (
          <small class="text-muted">({lists.length})</small>
        ) : null}
      </h2>

      {!lists && db && user && <div>Loading shopping lists...</div>}

      {lists && !lists.length && (
        <p>You currently don&apos;t have any lists.</p>
      )}

      {lists &&
        lists.map((list) => {
          return (
            <div
              key={list.id}
              class="card"
              style={{ marginTop: 30, cursor: "pointer" }}
              onClick={() => {
                route(getShoppingHref(list), true);
              }}
            >
              <div class="card-body">
                <h5 class="card-title">{list.name}</h5>
                <h6 class="card-subtitle mb-2 text-muted">{list.notes}</h6>
                <p class="card-text">
                  {db && <PreviewList list={list} db={db} />}
                </p>
              </div>
            </div>
          );
        })}

      {db && (
        <div style={{ marginTop: 60 }}>
          <button
            type="button"
            class="btn btn-secondary"
            data-toggle="modal"
            data-target="#newGroupModal"
            onClick={() => {
              setShowNewGroupModal(true);
            }}
          >
            {lists && !lists.length ? "Create list" : "Create new list"}
          </button>
        </div>
      )}

      <CreateModal
        show={showNewGroupModal}
        close={() => {
          setShowNewGroupModal(false);
        }}
        create={async (name: string, notes: string) => {
          await createNewGroup(name, notes);
        }}
      />

      <GoBack />
    </div>
  );
};

export default Shopping;

function CreateModal({
  show,
  close,
  create,
}: {
  show: boolean;
  close: () => void;
  create: (name: string, notes: string) => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNewGroupNotes] = useState("");

  return (
    <div
      class={show ? "modal fade show" : "modal fade"}
      id="newGroupModal"
      aria-labelledby="exampleModalLabel"
      aria-hidden={!show ? "true" : null}
      style={show ? { display: "block" } : {}}
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="exampleModalLabel">
              New shopping group
            </h5>
            <button
              type="button"
              class="close"
              data-dismiss="modal"
              aria-label="Close"
              onClick={close}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <form
              onSubmit={(
                event: h.JSX.TargetedEvent<HTMLFormElement, Event>
              ) => {
                event.preventDefault();
                if (name.trim()) {
                  create(name.trim(), notes.trim());
                }
              }}
            >
              <div class="mb-3">
                <label htmlFor="groupName" class="form-label">
                  Group name
                </label>
                <input
                  value={name}
                  onInput={({
                    currentTarget,
                  }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                    setName(currentTarget.value);
                  }}
                  type="text"
                  class="form-control"
                  placeholder="for example: Hardware store"
                  id="groupName"
                  aria-describedby="groupNameHelp"
                />
                <div id="groupNameHelp" class="form-text">
                  You can change the name later.
                </div>
              </div>
              <div class="mb-3">
                <label htmlFor="groupNotes" class="form-label">
                  Notes/Description
                </label>
                <input
                  value={notes}
                  onInput={({
                    currentTarget,
                  }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                    setNewGroupNotes(currentTarget.value);
                  }}
                  type="text"
                  class="form-control"
                  id="groupNotes"
                  aria-describedby="groupNotesHelp"
                />
                <div id="groupNotesHelp" class="form-text">
                  Just in case you need it and it helps.
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-dismiss="modal"
              onClick={close}
            >
              Close
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={!name.trim()}
              onClick={(
                event: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>
              ) => {
                event.preventDefault();
                if (name.trim()) {
                  create(name.trim(), notes.trim());
                }
              }}
            >
              Create list
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewList({
  list,
  db,
}: {
  list: List;
  db: firebase.firestore.Firestore;
}) {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    const itemsCollection = db.collection(`shoppinglists/${list.id}/items`);

    const ref = itemsCollection.where("removed", "==", false).onSnapshot(
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
        setItems(newItems);
      },
      (error) => {
        console.error(`Error listing on ${list.id}:`, error);
      }
    );
    return () => {
      if (ref) {
        ref();
      }
    };
  }, [list, db]);

  if (!items) {
    return (
      <div class="spinner-border" role="status">
        <span class="sr-only">Loading...</span>
      </div>
    );
  }

  if (!items.length) {
    return (
      <p>
        <i>List empty at the moment</i>
      </p>
    );
  }

  return (
    <ul>
      {items.slice(0, 5).map((item) => {
        return <li key={item.id}>{item.text}</li>;
      })}
      {items.length > 5 && (
        <li>
          <i>and {items.length - 5} more items...</i>
        </li>
      )}
    </ul>
  );
}
