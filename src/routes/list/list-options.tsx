import { FunctionalComponent, h } from "preact";
import { route } from "preact-router";
import { useState } from "preact/hooks";

import { Alert } from "../../components/alerts";
import { InvitesForm } from "./invites-form";
import { List } from "../../types";
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
};
