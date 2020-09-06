import { FunctionalComponent, h } from "preact";
import { route } from "preact-router";
import { useState } from "preact/hooks";

import { Alert } from "../../components/alerts";
import { InvitationsForm } from "./invites-form";
import { List, ListConfig } from "../../types";
import * as style from "./style.css";

interface Props {
  db: firebase.firestore.Firestore;
  list: List;
  user: firebase.User;
  close: () => void;
}

export const ListOptions: FunctionalComponent<Props> = ({
  db,
  list,
  close,
  user,
}: Props) => {
  const [name, setName] = useState(list.name);
  const [notes, setNotes] = useState(list.notes);
  const [disableGroups, setDisableGroups] = useState(
    !!list.config.disableGroups
  );
  const [disableQuantity, setDisableQuantity] = useState(
    !!list.config.disableQuantity
  );
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
          const config: ListConfig = {
            disableGroups,
            disableQuantity,
          };
          const doc = db.collection("shoppinglists").doc(list.id);
          doc
            .update({
              name: name.trim(),
              notes: notes.trim(),
              config,
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
            Allows you to <i>group</i> items and sort by that.
          </div>
        </div>

        <div class="mb-3">
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              checked={disableQuantity}
              onClick={() => {
                setDisableQuantity((prev) => !prev);
              }}
              id="newDisableQuantity"
              aria-describedby="newDisableQuantityHelp"
            />
            <label class="form-check-label" htmlFor="newDisableQuantity">
              Disable quantity
            </label>
          </div>
          <div id="newDisableQuantityHelp" class="form-text">
            A <i>quantity</i> doesn&apos;t make sense for all lists.
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

      {list.owners.length > 1 && (
        <div class={style.listoptions_section}>
          <h4>List co-owners</h4>
          <ul class="list-group">
            {list.owners.map((uid) => {
              const metadata = list.ownersMetadata[uid] || null;
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
        <InvitationsForm db={db} list={list} user={user} />
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
            message={deleteError}
            offerReload={true}
          />
        )}
      </div>
    </div>
  );
};
