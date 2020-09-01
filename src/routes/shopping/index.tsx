import { FunctionalComponent, h } from "preact";
import { route } from "preact-router";
import { useState, useEffect, useRef } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { List } from "../../types";
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

  async function createNewGroup(
    name: string,
    notes: string,
    disableGroups = false
  ) {
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
          recent_items: [],
          active_items_count: 0,
          disableGroups,
        });
        toggleAddNewList(false);
      } catch (error) {
        console.error("Error creating shopping list:", error);
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
        <div class={style.add_new_group}>
          <button
            type="button"
            class="btn btn-sm btn-outline-primary"
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
          create={async (
            name: string,
            notes: string,
            disableGroups: boolean
          ) => {
            await createNewGroup(name, notes, disableGroups);
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
  create: (name: string, notes: string, disableGroups: boolean) => void;
  lists: List[];
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [disableGroups, setDisableGroups] = useState(false);
  const newNameRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (newNameRef.current) {
      newNameRef.current.focus();
      newNameRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [newNameRef]);

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
          create(name.trim(), notes.trim(), disableGroups);
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
          ref={newNameRef}
          onInput={(event) => {
            setName(event.currentTarget.value);
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
          onInput={(event) => {
            setNotes(event.currentTarget.value);
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
      <div class="mb-3">
        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            checked={disableGroups}
            onClick={() => {
              setDisableGroups((prev) => !prev);
            }}
            id="newDisableGroups"
            aria-describedby="newDisableGroupsHelp"
          />
          <label class="form-check-label" htmlFor="newDisableGroups">
            Disable groups
          </label>
        </div>
        <div id="newDisableGroupsHelp" class="form-text">
          Allows you to group items and sort by that.
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
}: {
  list: List;
  db: firebase.firestore.Firestore;
}) {
  const items = list.recent_items || [];
  const activeItemsCount = list.active_items_count || 0;

  if (!items.length) {
    return (
      <p>
        <i>List empty at the moment.</i>
      </p>
    );
  }

  const count = activeItemsCount || items.length;
  const CUTOFF = 5;

  return (
    <ul class={style.list_preview_items}>
      {items.slice(0, CUTOFF).map((item) => {
        return (
          <li key={item.text}>
            <input
              class="form-check-input"
              type="checkbox"
              value=""
              disabled={true}
              checked={item.done}
            />{" "}
            {item.text}{" "}
            {!!item.quantity && item.quantity !== 1 && <b>x{item.quantity}</b>}
          </li>
        );
      })}
      {count > CUTOFF && (
        <li>
          <i>
            and {count - CUTOFF} more item{count - CUTOFF > 1 ? "s" : ""}...
          </i>
        </li>
      )}
    </ul>
  );
}
