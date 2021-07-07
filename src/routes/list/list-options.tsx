import { FunctionalComponent, h } from "preact";
import { route } from "preact-router";
import { useState } from "preact/hooks";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { InvitationsForm } from "./invites-form";
import { List, ListConfig } from "../../types";
import style from "./style.css";

interface Props {
  db: firebase.firestore.Firestore;
  list: List;
  user: firebase.User;
  close: () => void;
  togglePopularityContest: () => void;
}

export const ListOptions: FunctionalComponent<Props> = ({
  db,
  list,
  close,
  user,
  togglePopularityContest,
}: Props) => {
  const [name, setName] = useState(list.name);
  const [notes, setNotes] = useState(list.notes);
  const [disableGroups, setDisableGroups] = useState(
    !!list.config.disableGroups
  );
  const [disableQuantity, setDisableQuantity] = useState(
    !!list.config.disableQuantity
  );
  const [disableDefaultSuggestions, setDisableDefaultSuggestions] = useState(
    !!list.config.disableDefaultSuggestions
  );
  const [updateError, setUpdateError] = useState<Error | null>(null);

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
            disableDefaultSuggestions,
          };
          const doc = db.collection("shoppinglists").doc(list.id);
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
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              checked={disableDefaultSuggestions}
              onClick={() => {
                setDisableDefaultSuggestions((prev) => !prev);
              }}
              id="newDisableDefaultSuggestions"
              aria-describedby="newDisableDefaultSuggestionsHelp"
            />
            <label
              class="form-check-label"
              htmlFor="newDisableDefaultSuggestions"
            >
              Disable default suggestions
            </label>
          </div>
          <div id="newDisableDefaultSuggestionsHelp" class="form-text">
            Default suggestions are <i>food words</i> that help suggest when
            adding new items.
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
        <button
          type="button"
          class="btn btn-outline-primary"
          title="See which items you most often put onto the list"
          onClick={() => togglePopularityContest()}
        >
          Popularity contest &rarr;
        </button>
      </div>

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
      {list.owners.length === 1 ? (
        <DeleteListOption db={db} list={list} />
      ) : (
        <LeaveListOption db={db} list={list} user={user} />
      )}
    </div>
  );
};

function DeleteListOption({
  db,
  list,
}: {
  list: List;
  db: firebase.firestore.Firestore;
}) {
  const [confirmDelete, toggleConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  return (
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
          <h5>Are you sure?</h5>
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
  );
}

function LeaveListOption({
  db,
  list,
  user,
}: {
  list: List;
  db: firebase.firestore.Firestore;
  user: firebase.User;
}) {
  const [confirm, toggleConfirm] = useState(false);
  const [updateError, setUpdateError] = useState<Error | null>(null);

  return (
    <div class={style.listoptions_section}>
      <h4>Leave list</h4>
      <small>You&apos;re one of {list.owners.length} co-owners.</small>
      <div class="mb-3">
        <button
          type="button"
          class="btn btn-warning"
          onClick={() => {
            toggleConfirm(!confirm);
          }}
        >
          {confirm ? "Cancel" : "Leave list"}
        </button>
      </div>
      {confirm && (
        <div class="mb-3">
          <h5>Are you sure?</h5>
          <button
            type="button"
            class="btn btn-danger"
            onClick={() => {
              const doc = db.collection("shoppinglists").doc(list.id);

              doc
                .update({
                  owners: firebase.firestore.FieldValue.arrayRemove(user.uid),
                })
                .then(() => {
                  close();
                  route("/", true);
                })
                .catch((error) => {
                  console.error("Unable to leave list:", error);
                  setUpdateError(error);
                });
            }}
          >
            Yes, leave list
          </button>
        </div>
      )}
      {updateError && (
        <Alert
          heading="Unable to leave list"
          message={updateError}
          offerReload={true}
        />
      )}
    </div>
  );
}
