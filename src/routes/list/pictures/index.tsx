import { FunctionalComponent, h } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import firebase from "firebase/app";

import style from "./style.css";
import { FileUpload } from "../../../components/file-upload";
// import { ITEM_SUGGESTIONS } from "./default-suggestions";
import { List, Item, ListPicture, FirestoreListPicture } from "../../../types";
import { useDownloadImageURL } from "../hooks";
// import { stripEmojis } from "../../utils";
// import { getItemsSummary } from "./popularity-contest";

interface Props {
  db: firebase.firestore.Firestore;
  storage: firebase.storage.Storage;
  ready: boolean;
  list: List;
  items: Item[] | null;
  saveHandler: (text: string) => void;
}

export const Pictures: FunctionalComponent<Props> = ({
  db,
  storage,
  ready,
  items,
  list,
  saveHandler,
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
          console.log(data);

          if (data.deleted) {
            return;
          }
          const item = {
            id: doc.id,
            notes: data.notes,
            filePath: data.filePath,
            created: data.created,
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
  }, [undoableDelete]);

  const [saveListPictureError, setSaveListPictureError] =
    useState<Error | null>(null);

  function saveListPictureNotes(id: string, notes: string) {
    return db.collection(`shoppinglists/${list.id}/pictures`)
      .doc(id)
      .update({
        notes,
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

  const [undoingDelete, setUndoingDelete] = useState(false);

  return (
    <form
      class={style.pictures}
      onSubmit={(event) => {
        event.preventDefault();
        // saveHandler(newText);
        // setNewText("");
      }}
    >
      <FileUpload
        db={db}
        storage={storage}
        list={list}
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
          ></button>
        </div>
      )}

      {undoableDelete && (
        <div
          class="alert alert-warning alert-dismissible fade show"
          role="alert"
        >
          <button
            type="button"
            class="btn btn-secondary"
            disabled={undoingDelete}
            onClick={() => {
              setUndoingDelete(true);
              undeleteListPicture(undoableDelete).then(() => {
                setUndoableDelete(null);
                setUndoingDelete(false);
              });
            }}
          >
            {undoingDelete && (
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
            )}
            {undoingDelete ? " Undoing" : "Undo delete"}
          </button>
          <button
            type="button"
            class="btn-close btn-small"
            data-bs-dismiss="alert"
            aria-label="Close"
            onClick={() => {
              setUndoableDelete(null);
              setUndoingDelete(false);
              // setUndoingDelete(true);
              // setUndoableDelete(null).then(() => {
              //   setUndoingDelete(false);
              // });
            }}
          ></button>
        </div>
      )}

      {listPictures && (
        <ShowListPictures
          listPictures={listPictures}
          saveListPictureNotes={saveListPictureNotes}
          deleteListPicture={deleteListPicture}
        />
      )}
    </form>
  );
};

function ShowListPictures({
  listPictures,
  saveListPictureNotes,
  deleteListPicture,
}: {
  listPictures: ListPicture[];
  saveListPictureNotes: (id: string, notes: string) => void;
  deleteListPicture: (id: string) => void;
}) {
  return (
    <div class={style.list_pictures}>
      {/* <div class="row">
        <div class="col-sm-6">
          <div class="card" style="width: 18rem;">
            <img
              src="http://localhost:5001/thatsgroce/us-central1/downloadAndResizeAndStore/?image=list-pictures%2F2021%2F08%2F24%2FY2OxTTyEuzTqvwIxkuUU-1629821815674.jpg&width=100"
              class="card-img-top"
              alt="..."
            />
            <div class="card-body">
              <p class="card-text">
                Some quick example text to build on the card title and make up
                the bulk of the card's content.
              </p>
            </div>
          </div>
        </div>
        <div class="col-sm-6">
          <div class="card" style="width: 18rem;">
            <img
              src="http://localhost:5001/thatsgroce/us-central1/downloadAndResizeAndStore/?image=list-pictures%2F2021%2F08%2F24%2FY2OxTTyEuzTqvwIxkuUU-1629821815674.jpg&width=100"
              class="card-img-top"
              alt="..."
            />
            <div class="card-body">
              <p class="card-text">
                Some quick example text to build on the card title and make up
                the bulk of the card's content.
              </p>
            </div>
          </div>
        </div>
      </div> */}

      <ul class="list-group list-group-flush">
        {listPictures.map((listPicture) => {
          return (
            <li class="list-group-item" key={listPicture.id}>
              <Image
                filePath={listPicture.filePath}
                maxWidth={100}
                maxHeight={100}
              />
              <div class="row">
                <div class="col">
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Notes"
                    aria-label="Notes"
                    value={listPicture.notes}
                    onInput={(event) => {
                      console.log("Notes changed", [
                        event.currentTarget.value,
                        listPicture.notes,
                      ]);
                    }}
                    onChange={(event) => {
                      saveListPictureNotes(
                        listPicture.id,
                        event.currentTarget.value
                      );
                    }}
                  />
                </div>
                <div class="col">
                  <button class="btn btn-primary">Save</button>
                  <button
                    class="btn btn-danger"
                    onClick={() => {
                      deleteListPicture(listPicture.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Image({
  filePath,
  maxWidth,
  maxHeight,
}: {
  filePath: string;
  maxWidth: number;
  maxHeight: number;
}) {
  const { url: downloadURL } = useDownloadImageURL(filePath, 1000, false);
  const { url: thumbnailURL, error: thumbnailError } = useDownloadImageURL(
    filePath,
    100,
    false
  );
  return (
    <a href={downloadURL}>
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
