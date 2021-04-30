import { FunctionalComponent, h } from "preact";
import { Link, route } from "preact-router";
import { useState, useEffect, useRef } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";

import { ShowOwners } from "../../components/show-owners";
import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { Menu, MenuConfig } from "../../types";

interface Props {
  user: firebase.User | false | null;
  db: firebase.firestore.Firestore | null;
  menus: Menu[] | null;
}

const Menus: FunctionalComponent<Props> = ({ user, db, menus }: Props) => {
  const [addNewMenu, toggleAddNewMenu] = useState(false);

  useEffect(() => {
    document.title = "Menus";
  }, []);

  async function createNewMenu(
    name: string,
    notes: string,
    config: MenuConfig
  ) {
    if (db && user && menus) {
      if (
        menus
          .map((menu) => menu.name.toLowerCase())
          .includes(name.toLowerCase())
      ) {
        console.warn("Menu already exists by that name.");
        return;
      }
      try {
        await db.collection("menus").add({
          name,
          notes,
          owners: [user.uid],
          added: firebase.firestore.Timestamp.fromDate(new Date()),
          modified: firebase.firestore.Timestamp.fromDate(new Date()),
          order:
            1 +
            ((menus && Math.max(...menus.map((menu) => menu.order || 0))) || 0),
          recent_items: [],
          active_items_count: 0,
          config,
        });
        toggleAddNewMenu(false);
      } catch (error) {
        console.error("Error creating new menu:", error);
      }
    }
  }

  function getMenuHref(menu: Menu) {
    return `/menus/${menu.id}`;
  }

  // Auth as loaded and determined that the user is not signed in
  if (user === false) {
    return (
      <div class={style.menus}>
        <Alert
          heading={"You're not signed in"}
          message={<p>Use the menu bar below to sign in first.</p>}
        />
      </div>
    );
  }

  return (
    <div class={style.menus}>
      <h2>
        Menus{" "}
        {menus && menus.length ? (
          <small class="text-muted">({menus.length})</small>
        ) : null}
      </h2>

      {!menus && db && user && <div>Loading menus...</div>}

      {menus && !menus.length && (
        <p>You currently don&apos;t have any menus.</p>
      )}

      {menus &&
        menus.map((menu) => {
          return (
            <div
              key={menu.id}
              class={`card ${style.card} shadow bg-white rounded`}
              onClick={() => {
                route(getMenuHref(menu), false);
              }}
            >
              <div class="card-body">
                <h5 class="card-title">{menu.name}</h5>
                <h6 class="card-subtitle mb-2 text-muted">{menu.notes}</h6>
                <div class={`card-text ${style.menu_preview}`}>
                  {db && <PreviewMenu menu={menu} db={db} />}
                </div>
                <ShowOwners uids={menu.owners} metadata={menu.ownersMetadata} />
              </div>
            </div>
          );
        })}

      {db && user && !user.isAnonymous && (
        <div class={style.add_new_menu}>
          <button
            type="button"
            class="btn btn-sm btn-outline-primary"
            onClick={() => {
              toggleAddNewMenu((prev) => !prev);
            }}
          >
            {addNewMenu
              ? "Close"
              : menus && !menus.length
              ? "Create menu"
              : "Create new menu"}
          </button>
        </div>
      )}

      {db && user && user.isAnonymous && (
        <div class={`${style.sign_in_reminder} text-right`}>
          <Link href="/signin" class="btn btn-sm btn-outline-primary">
            Sign in to not lose your menu &rarr;
          </Link>
        </div>
      )}

      {db && addNewMenu && menus && (
        <NewMenu
          menus={menus}
          create={async (name: string, notes: string, config: MenuConfig) => {
            await createNewMenu(name, notes, config);
          }}
        />
      )}

      <GoBack />
    </div>
  );
};

export default Menus;

function NewMenu({
  create,
  menus,
}: {
  create: (name: string, notes: string, config: MenuConfig) => void;
  menus: Menu[];
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [startsOnAMonday, setStartsOnAMonday] = useState(false);
  // const [disableGroups, setDisableGroups] = useState(false);
  // const [disableQuantity, setDisableQuantity] = useState(false);
  // const [disableDefaultSuggestions, setDisableDefaultSuggestions] = useState(
  //   false
  // );
  const newNameRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (newNameRef.current) {
      newNameRef.current.focus();
      newNameRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [newNameRef]);

  const [submitting, setSubmitting] = useState(false);

  const submittable =
    name.trim() &&
    !menus
      .map((menu) => menu.name.toLowerCase())
      .includes(name.trim().toLowerCase());

  return (
    <form
      style={{ marginTop: 40 }}
      onSubmit={(event) => {
        event.preventDefault();
        if (submittable) {
          setSubmitting(true);
          create(name.trim(), notes.trim(), {
            startsOnAMonday
          });
        }
      }}
    >
      <h4>New menu</h4>

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
          placeholder={`for example: Christmas ${new Date().getFullYear()}`}
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
              checked={startsOnAMonday}
              onClick={() => {
                setStartsOnAMonday((prev) => !prev);
              }}
              id="newStartsOnAMonday"
              aria-describedby="newStartsOnAMonday"
            />
            <label class="form-check-label" htmlFor="newStartsOnAMonday">
              Week starts on the Monday
            </label>
          </div>
          {/* <div id="newStartsOnAMonday" class="form-text">
            Allows you to <i>group</i> items and sort by that.
          </div> */}
        </div>


      <button type="submit" class="btn btn-primary" disabled={!submittable}>
        {submitting ? "Creating..." : "Create menu"}
      </button>
    </form>
  );
}


// WHAT'S THIS FOR?!
function PreviewMenu({
  menu,
}: {
  menu: Menu;
  db: firebase.firestore.Firestore;
}) {
  const meals = menu.recent_meals || [];
  // const activeItemsCount = list.active_items_count || 0;

  if (!meals.length) {
    return (
      <p>
        <i>Menu empty at the moment.</i>
      </p>
    );
  }

  // const count = activeItemsCount || items.length;
  // const CUTOFF = 5;

  return (
    <ul>
      <li>Work</li>
      <li>Harder</li>
      <li>On</li>
      <li>This</li>
    </ul>
  );
  // return (
  //   <ul class={`text-muted ${style.list_preview_items}`}>
  //     {items.slice(0, CUTOFF).map((item) => {
  //       return (
  //         <li key={item.text} class={`overflow-hidden ${style.preview_item}`}>
  //           <input
  //             class="form-check-input"
  //             type="checkbox"
  //             value=""
  //             disabled={true}
  //             checked={item.done}
  //           />{" "}
  //           {item.text}{" "}
  //           {!list.config.disableQuantity &&
  //             !!item.quantity &&
  //             item.quantity !== 1 && <b>x{item.quantity}</b>}
  //         </li>
  //       );
  //     })}
  //     {count > CUTOFF && (
  //       <li>
  //         <i>
  //           and {count - CUTOFF} more item{count - CUTOFF > 1 ? "s" : ""}...
  //         </i>
  //       </li>
  //     )}
  //   </ul>
  // );
}
