import { FunctionalComponent, h } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import firebase from "firebase/app";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import style from "./style.css";
import { FileUpload } from "../../../components/file-upload";
import { List, Item, ListPicture, FirestoreListPicture } from "../../../types";
import { useDownloadImageURL } from "../hooks";

dayjs.extend(relativeTime);

interface Props {
  db: firebase.firestore.Firestore;
  storage: firebase.storage.Storage;
  ready: boolean;
  list: List;
  items: Item[] | null;
  saveHandler: (text: string) => void;
  openImageModal: (url: string) => void;
}

export const Pictures: FunctionalComponent<Props> = ({
  db,
  storage,
  ready,
  items,
  list,
  saveHandler,
  openImageModal,
}: Props) => {
  const [listPictures, setListPictures] = useState<ListPicture[] | null>(null);
  const [listPicturesError, setListPicturesError] = useState<Error | null>(
    null
  );

  useEffect(() => {
    if (listPictures) {
      document.title = `Pictures (${listPictures.length}) - ${list.name}`;
    } else {
      document.title = `Pictures - ${list.name}`;
    }
  }, [list, listPictures]);

  useEffect(() => {
    const ref = db.collection(`shoppinglists/${list.id}/pictures`).onSnapshot(
      (snapshot) => {
        const newListPictures: ListPicture[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as FirestoreListPicture;
          if (data.deleted) {
            return;
          }
          const item = {
            id: doc.id,
            notes: data.notes,
            filePath: data.filePath,
            created: data.created,
            modified: data.modified,
          };
          newListPictures.push(item);
        });
        newListPictures.sort((a, b) => {
          // Most recently created first
          return b.created.seconds - a.created.seconds;
        });

        setListPictures(newListPictures);

        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            // const newRecentlyModifiedItems = new Map();
            // newRecentlyModifiedItems.set(change.doc.id, new Date());
            // setRecentlyModifiedItems(newRecentlyModifiedItems);
            console.log("RECENTLY UPDATED", change.doc.data().filePath);
          }
        });
      },
      (error) => {
        console.error("Snapshot error:", error);
        setListPicturesError(error);
      }
    );
    return () => {
      ref();
    };
  }, [db, list]);

  const [undoableDelete, setUndoableDelete] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    if (undoableDelete) {
      setTimeout(() => {
        if (mounted) {
          setUndoableDelete(null);
        }
      }, 9000);
    }
    return () => {
      mounted = false;
    };
  }, [undoableDelete]);

  const [saveListPictureError, setSaveListPictureError] =
    useState<Error | null>(null);

  function saveListPictureNotes(id: string, notes: string) {
    return db
      .collection(`shoppinglists/${list.id}/pictures`)
      .doc(id)
      .update({
        notes,
        modified: firebase.firestore.Timestamp.fromDate(new Date()),
      })
      .catch((error) => {
        console.error(
          `Error trying to update picture notes ${list.id}:`,
          error
        );
        setSaveListPictureError(error);
      });
  }

  function deleteListPicture(id: string) {
    return db
      .collection(`shoppinglists/${list.id}/pictures`)
      .doc(id)
      .update({
        deleted: firebase.firestore.Timestamp.fromDate(new Date()),
      })
      .then(() => {
        setUndoableDelete(id);
      })
      .catch((error) => {
        console.error(`Error trying to delete picture ${list.id}:`, error);
        setSaveListPictureError(error);
      });
  }

  function undeleteListPicture(id: string) {
    return db
      .collection(`shoppinglists/${list.id}/pictures`)
      .doc(id)
      .update({
        deleted: null,
      })
      .then(() => {
        setUndoableDelete(null);
      })
      .catch((error) => {
        setSaveListPictureError(error);
      });
  }

  return (
    <div class={style.pictures}>
      <FileUpload
        db={db}
        storage={storage}
        list={list}
        disabled={!ready}
        item={null}
        prefix="list-pictures"
        onClose={() => {
          // console.warn("CLOSE!");
        }}
      />

      {saveListPictureError && (
        <div
          class="alert alert-danger alert-dismissible fade show"
          role="alert"
        >
          An error occurred trying to save.
          <button
            type="button"
            class="btn-close btn-small"
            data-bs-dismiss="alert"
            aria-label="Close"
            onClick={() => {
              setSaveListPictureError(null);
            }}
          />
        </div>
      )}

      {undoableDelete && (
        <UndoListPictureDelete
          undoableDelete={undoableDelete}
          undeleteListPicture={undeleteListPicture}
          removeUndoableDelete={() => {
            setUndoableDelete(null);
          }}
        />
      )}

      {listPictures && (
        <ShowListPictures
          listPictures={listPictures}
          saveListPictureNotes={saveListPictureNotes}
          deleteListPicture={deleteListPicture}
          openImageModal={openImageModal}
        />
      )}
    </div>
  );
};

function UndoListPictureDelete({
  undoableDelete,
  undeleteListPicture,
  removeUndoableDelete,
}: {
  undoableDelete: string;
  undeleteListPicture: (id: string) => Promise<void>;
  removeUndoableDelete: () => void;
}) {
  const [undoingDelete, setUndoingDelete] = useState(false);
  return (
    <div class="alert alert-warning alert-dismissible fade show" role="alert">
      <button
        type="button"
        class="btn btn-secondary"
        disabled={undoingDelete}
        onClick={() => {
          setUndoingDelete(true);
          undeleteListPicture(undoableDelete).then(() => {
            // setUndoableDelete(null);
            removeUndoableDelete();
            // setUndoingDelete(false);
          });
        }}
      >
        {undoingDelete && (
          <span
            class="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          />
        )}
        {undoingDelete ? " Undoing" : "Undo delete"}
      </button>
      <button
        type="button"
        class="btn-close btn-small"
        data-bs-dismiss="alert"
        aria-label="Close"
        onClick={() => {
          // setUndoableDelete(null);
          removeUndoableDelete();
          // setUndoingDelete(false);
        }}
      />
    </div>
  );
}

function ShowListPictures({
  listPictures,
  saveListPictureNotes,
  deleteListPicture,
  openImageModal,
}: {
  listPictures: ListPicture[];
  saveListPictureNotes: (id: string, notes: string) => Promise<void>;
  deleteListPicture: (id: string) => void;
  openImageModal: (url: string) => void;
}) {
  return (
    <div class={style.list_pictures}>
      <ul class="list-group list-group-flush">
        {listPictures.map((listPicture) => {
          return (
            <li class="list-group-item" key={listPicture.id}>
              <Image
                filePath={listPicture.filePath}
                maxWidth={100}
                maxHeight={100}
                openImageModal={openImageModal}
              />
              <div class="row">
                <div class="col">
                  <NotesForm
                    listPicture={listPicture}
                    saveListPictureNotes={saveListPictureNotes}
                  />
                </div>
                <div class="col">
                  <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    onClick={() => {
                      deleteListPicture(listPicture.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
                <p>
                  <small class="fw-light">
                    Added: {dayjs(listPicture.created.toDate()).fromNow()}
                  </small>{" "}
                  {listPicture.created.seconds !==
                    listPicture.modified.seconds && (
                    <small class="fw-light" style={{ marginLeft: 20 }}>
                      Modified: {dayjs(listPicture.modified.toDate()).fromNow()}
                    </small>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NotesForm({
  listPicture,
  saveListPictureNotes,
}: {
  listPicture: ListPicture;
  saveListPictureNotes: (id: string, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(listPicture.notes);
  const [hasChanged, setHasChanged] = useState(false)
  useEffect(() => {
    if (notes !== listPicture.notes) {
      setHasChanged(true)
    } else {
      setHasChanged(false)
    }
  }, [notes, listPicture.notes])
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveListPictureNotes(listPicture.id, notes.trim());
      }}
    >
      <div class="input-group input-group-sm mb-3">
        <input
          type="text"
          class="form-control"
          placeholder="Notes"
          aria-label="Notes"
          aria-describedby="button-addon2"
          value={notes}
          onInput={(event) => {
            setNotes(event.currentTarget.value);
          }}
        />
        <button
          class="btn btn-outline-secondary"
          type="submit"
          disabled={!hasChanged}
          id="button-addon2"
        >
          Save
        </button>
      </div>
    </form>
  );
}

function Image({
  filePath,
  maxWidth,
  maxHeight,
  openImageModal,
}: {
  filePath: string;
  maxWidth: number;
  maxHeight: number;
  openImageModal: (url: string) => void;
}) {
  const { url: downloadURL } = useDownloadImageURL(filePath, 1000, false);
  const { url: thumbnailURL, error: thumbnailError } = useDownloadImageURL(
    filePath,
    100,
    false
  );
  return (
    <a
      href={downloadURL}
      onClick={(event) => {
        event.preventDefault();
        openImageModal(downloadURL || thumbnailURL);
      }}
    >
      <img
        class="rounded float-start"
        style={{
          width: maxWidth,
          height: maxHeight,
          "object-fit": "cover",
          marginRight: 20,
        }}
        src={thumbnailURL}
      />
    </a>
  );
}
