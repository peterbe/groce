import { FunctionalComponent, h } from "preact";
import { route } from "preact-router";
import { useState } from "preact/hooks";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { InvitationsForm } from "./invites-form";
import { Menu, MenuConfig } from "../../types";
import * as style from "./style.css";

interface Props {
  db: firebase.firestore.Firestore;
  menu: Menu;
  user: firebase.User;
  close: () => void;
}

export const MenuOptions: FunctionalComponent<Props> = ({
  db,
  menu,
  close,
  user,
}: Props) => {
  const [name, setName] = useState(menu.name);
  const [notes, setNotes] = useState(menu.notes);
  const [startsOnAMonday, setStartsOnAMonday] = useState(menu.config.startsOnAMonday)
  const [updateError, setUpdateError] = useState<Error | null>(null);

  return (
    <div class={style.listoptions}>
      <form
        class={style.listoptions_section}
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          const config: MenuConfig = {
            startsOnAMonday,
          };
          const doc = db.collection("menus").doc(menu.id);
          doc
            .update({
              name: name.trim(),
              notes: notes.trim(),
              config,
              modified: firebase.firestore.Timestamp.fromDate(new Date()),
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
          <Alert
            heading="Update error"
            message={updateError}
            offerReload={true}
          />
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
            onInput={(event) => {
              setName(event.currentTarget.value);
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
            onInput={(event) => {
              setNotes(event.currentTarget.value);
            }}
            aria-label="List's notes"
            aria-describedby="notesHelp"
          />

          <div id="notesHelp" class="form-text">
            Optional
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

      {menu.owners.length > 1 && (
        <div class={style.listoptions_section}>
          <h4>List co-owners</h4>
          <ul class="list-group">
            {menu.owners.map((uid) => {
              const metadata = menu.ownersMetadata[uid] || null;
              return (
                <li key={uid} class="list-group-item">
                  {metadata ? (
                    <span>
                      <img
                        class="img-thumbnail float-left"
                        width="60"
                        style={{ marginRight: 5 }}
                        src={metadata.photoURL || "/assets/icons/avatar.svg"}
                        alt={metadata.displayName || metadata.email || uid}
                      />{" "}
                      <p>
                        {metadata.displayName || metadata.email}
                        <br />
                        {metadata.displayName && metadata.email ? (
                          <small>{metadata.email}</small>
                        ) : (
                          ""
                        )}
                      </p>
                    </span>
                  ) : uid === user.uid ? (
                    "You"
                  ) : (
                    "someone else"
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div class={style.listoptions_section}>
        <h4>Share list (invite co-owners)</h4>
        <InvitationsForm db={db} menu={menu} user={user} />
      </div>
      {menu.owners.length === 1 ? (
        <DeleteMenuOption db={db} menu={menu} />
      ) : (
        <LeaveMenuOption db={db} menu={menu} user={user} />
      )}
    </div>
  );
};

function DeleteMenuOption({
  db,
  menu,
}: {
  menu: Menu;
  db: firebase.firestore.Firestore;
}) {
  const [confirmDelete, toggleConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  return (
    <div class={style.listoptions_section}>
      <h4>Delete menu</h4>
      <div class="mb-3">
        <button
          type="button"
          class="btn btn-warning"
          onClick={() => {
            toggleConfirmDelete(!confirmDelete);
          }}
        >
          {confirmDelete ? "Cancel" : "Delete menu"}
        </button>
      </div>
      {confirmDelete && (
        <div class="mb-3">
          <h5>Are you sure?</h5>
          <p>This can&apos;t be undone</p>
          <button
            type="button"
            class="btn btn-danger"
            onClick={() => {
              const doc = db.collection("menus").doc(menu.id);

              doc
                .delete()
                .then(() => {
                  close();
                  route("/menus", true);
                })
                .catch((error) => {
                  console.error("Unable to delete menu:", error);
                  setDeleteError(error);
                });
            }}
          >
            Yes, delete this menu
          </button>
        </div>
      )}
      {deleteError && (
        <Alert
          heading="Unable to delete menu"
          message={deleteError}
          offerReload={true}
        />
      )}
    </div>
  );
}

function LeaveMenuOption({
  db,
  menu,
  user,
}: {
  menu: Menu;
  db: firebase.firestore.Firestore;
  user: firebase.User;
}) {
  const [confirm, toggleConfirm] = useState(false);
  const [updateError, setUpdateError] = useState<Error | null>(null);

  return (
    <div class={style.listoptions_section}>
      <h4>Leave menu</h4>
      <small>You&apos;re one of {menu.owners.length} co-owners.</small>
      <div class="mb-3">
        <button
          type="button"
          class="btn btn-warning"
          onClick={() => {
            toggleConfirm(!confirm);
          }}
        >
          {confirm ? "Cancel" : "Leave menu"}
        </button>
      </div>
      {confirm && (
        <div class="mb-3">
          <h5>Are you sure?</h5>
          <button
            type="button"
            class="btn btn-danger"
            onClick={() => {
              const doc = db.collection("menus").doc(menu.id);

              doc
                .update({
                  owners: firebase.firestore.FieldValue.arrayRemove(user.uid),
                })
                .then(() => {
                  close();
                  route("/", true);
                })
                .catch((error) => {
                  console.error("Unable to leave menu:", error);
                  setUpdateError(error);
                });
            }}
          >
            Yes, leave menu
          </button>
        </div>
      )}
      {updateError && (
        <Alert
          heading="Unable to leave menu"
          message={updateError}
          offerReload={true}
        />
      )}
    </div>
  );
}
