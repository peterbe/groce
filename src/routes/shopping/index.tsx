import { FunctionalComponent, h, JSX } from "preact";
import { route } from "preact-router";
import { useState, useEffect } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { FirestoreItem, Item, List } from "../../types";
// import { list } from "../list/style.css";

interface Props {
  user: firebase.User | false | null;
  db: firebase.firestore.Firestore | null;
  lists: List[] | null;
}

const Shopping: FunctionalComponent<Props> = ({ user, db, lists }: Props) => {
  const [addNewList, toggleAddNewList] = useState(false);

  useEffect(() => {
    document.title = "Shopping lists";
  }, []);

  async function createNewGroup(name: string, notes: string) {
    if (db && user && lists) {
      if (
        lists
          .map((list) => list.name.toLowerCase())
          .includes(name.toLowerCase())
      ) {
        console.warn("List already exists by that name.");
        return;
      }
      try {
        await db.collection("shoppinglists").add({
          name,
          notes,
          owners: [user.uid],
          order:
            1 +
            ((lists && Math.max(...lists.map((list) => list.order || 0))) || 0),
        });
        toggleAddNewList(false);
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
                  {/* {db && <PreviewList list={list} db={db} />} */}
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
            onClick={() => {
              toggleAddNewList((prev) => !prev);
            }}
          >
            {addNewList
              ? "Close"
              : lists && !lists.length
              ? "Create list"
              : "Create new list"}
          </button>
        </div>
      )}

      {db && addNewList && lists && (
        <NewList
          lists={lists}
          create={async (name: string, notes: string) => {
            await createNewGroup(name, notes);
          }}
        />
      )}

      <GoBack />
    </div>
  );
};

export default Shopping;

function NewList({
  create,
  lists,
}: {
  create: (name: string, notes: string) => void;
  lists: List[];
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const submittable =
    name.trim() &&
    !lists
      .map((list) => list.name.toLowerCase())
      .includes(name.trim().toLowerCase());

  return (
    <form
      style={{ marginTop: 40 }}
      onSubmit={(event) => {
        event.preventDefault();
        if (submittable) {
          create(name.trim(), notes.trim());
        }
      }}
    >
      <h4>New shopping list</h4>

      <div class="mb-3">
        <label htmlFor="newName" class="form-label">
          Name
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
          id="newName"
          aria-describedby="nameHelp"
        />
        <div id="nameHelp" class="form-text">
          You can change the name later.
        </div>
      </div>
      <div class="mb-3">
        <label htmlFor="newNotes" class="form-label">
          Notes/Description
        </label>
        <input
          value={notes}
          onInput={({
            currentTarget,
          }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
            setNotes(currentTarget.value);
          }}
          type="text"
          class="form-control"
          id="newNotes"
          aria-describedby="newNotesHelp"
        />
        <div id="newNotesHelp" class="form-text">
          Just in case you need it and it helps.
        </div>
      </div>
      <button type="submit" class="btn btn-primary" disabled={!submittable}>
        Create list
      </button>
    </form>
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
  const [itemsError, setItemsError] = useState<Error | null>(null);

  useEffect(() => {
    if (list.metadata.hasPendingWrites) {
      // List has pending writes so don't start querying it yet
      return;
    }

    const itemsCollection = db
      .collection("shoppinglists")
      .doc(list.id)
      .collection("items");

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
            times_added: data.times_added || 1,
          });
        });
        setItems(newItems);
      },
      (error) => {
        console.error(`Error listing on ${list.id}:`, error);
        setItemsError(error);
      }
    );
    return () => {
      if (ref) {
        ref();
      }
    };
  }, [list, db]);

  if (itemsError) {
    return (
      <Alert
        heading="Error previewing list items"
        message={itemsError.toString()}
      />
    );
  }

  if (!items || list.metadata.hasPendingWrites) {
    return (
      <div class="spinner-border" role="status">
        <span class="sr-only">Loading...</span>
      </div>
    );
  }

  if (!items.length) {
    return (
      <p>
        <i>List empty at the moment.</i>
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
