import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { route } from "preact-router";
import firebase from "firebase/app";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import style from "./style.css";
import { FileUpload } from "../../../components/file-upload";
import {
  List,
  Item,
  ListPicture,
  FirestoreListPicture,
  ListPictureText,
  FirestoreListPictureText,
} from "../../../types";
import { DisplayImage } from "../../../components/display-image";

dayjs.extend(relativeTime);

interface Props {
  db: firebase.firestore.Firestore;
  storage: firebase.storage.Storage;
  ready: boolean;
  list: List;
  items: Item[] | null;
  saveHandler: (text: string) => Promise<void>;
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

  const [listPictureTexts, setListPictureTexts] = useState<
    Map<string, ListPictureText>
  >(new Map());
  const [listPictureTextsError, setListPictureTextsError] =
    useState<Error | null>(null);

  useEffect(() => {
    if (listPictures) {
      document.title = `Pictures (${listPictures.length}) - ${list.name}`;
    } else {
      document.title = `Pictures - ${list.name}`;
    }
  }, [list, listPictures]);

  // Set up watcher on /pictures collection
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

        // snapshot.docChanges().forEach((change) => {
        //   if (change.type === "modified") {
        //     // const newRecentlyModifiedItems = new Map();
        //     // newRecentlyModifiedItems.set(change.doc.id, new Date());
        //     // setRecentlyModifiedItems(newRecentlyModifiedItems);
        //     console.log("RECENTLY UPDATED", change.doc.data().filePath);
        //   }
        // });
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

  // Set up watcher on /texts collection
  useEffect(() => {
    const ref = db.collection(`shoppinglists/${list.id}/texts`).onSnapshot(
      (snapshot) => {
        const newListPictureTexts: Map<string, ListPictureText> = new Map();
        snapshot.forEach((doc) => {
          const data = doc.data() as FirestoreListPictureText;
          const item = {
            id: doc.id,
            filePath: data.filePath,
            created: data.created,
            // words: data.words,
            text: data.text,
            foodWords: data.foodWords,
          };
          newListPictureTexts.set(item.filePath, item);
        });
        setListPictureTexts(newListPictureTexts);
      },
      (error) => {
        console.error("Snapshot error:", error);
        setListPictureTextsError(error);
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

  async function saveNewTexts(words: string[]) {
    await Promise.all(words.map((word) => saveHandler(word)));
    route(`/shopping/${list.id}`, true);
  }

  const [uploadedFiles, setUploadedFiles] = useState<Map<string, File>>(
    new Map()
  );

  return (
    <div class={style.pictures}>
      <FileUpload
        db={db}
        storage={storage}
        list={list}
        disabled={!ready}
        item={null}
        prefix="list-pictures"
        onUploaded={({ file, filePath }: { file: File; filePath: string }) => {
          const newMap: Map<string, File> = new Map(uploadedFiles);
          newMap.set(filePath, file);
          setUploadedFiles(newMap);
        }}
      />

      {listPicturesError && (
        <div
          class="alert alert-danger alert-dismissible fade show"
          role="alert"
        >
          Sorry. An error occurred trying to fetch your pictures.
          <br />
          <a
            href={`/shopping/${list.id}/pictures`}
            class="btn btn-warning"
            onClick={(event) => {
              event.preventDefault();
              window.location.reload();
            }}
          >
            Reload
          </a>
          <br />
          <code>{listPicturesError.toString()}</code>
          <button
            type="button"
            class="btn-close btn-small"
            data-bs-dismiss="alert"
            aria-label="Close"
            onClick={() => {
              setListPicturesError(null);
            }}
          />
        </div>
      )}

      {listPictureTextsError && !listPicturesError && (
        <div
          class="alert alert-danger alert-dismissible fade show"
          role="alert"
        >
          Sorry. An error occurred trying to fetch your picture texts.
          <br />
          <a
            href={`/shopping/${list.id}/pictures`}
            class="btn btn-warning"
            onClick={(event) => {
              event.preventDefault();
              window.location.reload();
            }}
          >
            Reload
          </a>
          <br />
          <code>{listPictureTextsError.toString()}</code>
          <button
            type="button"
            class="btn-close btn-small"
            data-bs-dismiss="alert"
            aria-label="Close"
            onClick={() => {
              setListPictureTextsError(null);
            }}
          />
        </div>
      )}

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
          listPictureTexts={listPictureTexts}
          saveListPictureNotes={saveListPictureNotes}
          deleteListPicture={deleteListPicture}
          openImageModal={openImageModal}
          uploadedFiles={uploadedFiles}
          items={items}
          saveNewTexts={saveNewTexts}
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
            removeUndoableDelete();
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
          removeUndoableDelete();
        }}
      />
    </div>
  );
}

function ShowListPictures({
  listPictures,
  listPictureTexts,
  saveListPictureNotes,
  deleteListPicture,
  openImageModal,
  uploadedFiles,
  items,
  saveNewTexts,
}: {
  listPictures: ListPicture[];
  listPictureTexts: Map<string, ListPictureText>;
  saveListPictureNotes: (id: string, notes: string) => Promise<void>;
  deleteListPicture: (id: string) => void;
  openImageModal: (url: string) => void;
  uploadedFiles: Map<string, File>;
  items: Item[] | null;
  saveNewTexts: (words: string[]) => void;
}) {
  return (
    <div class={style.list_pictures}>
      {/* <div class="toast-container position-absolute p-3 top-0 end-0" style="z-index: 1100">
        <div
          id="liveToast"
          class="toast fade show"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div class="toast-header">
            <strong class="me-auto">Bootstrap</strong>
            <small>11 mins ago</small>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="toast"
              aria-label="Close"
            ></button>
          </div>
          <div class="toast-body">Hello, world! This is a toast message.</div>
        </div>
      </div> */}

      <ul class="list-group list-group-flush">
        {listPictures.map((listPicture) => {
          const listPictureText = listPictureTexts.get(listPicture.filePath);
          return (
            <li
              class={`list-group-item ${style.picture_group}`}
              key={listPicture.id}
            >
              <NotesForm
                listPicture={listPicture}
                saveListPictureNotes={saveListPictureNotes}
              />

              <DisplayImage
                filePath={listPicture.filePath}
                file={uploadedFiles.get(listPicture.filePath)}
                maxWidth={450}
                maxHeight={450}
                openImageModal={openImageModal}
                className="img-fluid rounded"
              />

              {listPictureText ? (
                <div>
                  <ListWords
                    listPictureText={listPictureText}
                    items={items}
                    saveNewTexts={saveNewTexts}
                  />
                </div>
              ) : (
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">
                    Loading text from picture...
                  </span>
                </div>
              )}

              <p>
                <small class="fw-light">
                  Added: {dayjs(listPicture.created.toDate()).fromNow()}
                </small>
                <br />
                {listPicture.created.seconds !==
                  listPicture.modified.seconds && (
                  <small class="fw-light">
                    Modified: {dayjs(listPicture.modified.toDate()).fromNow()}
                  </small>
                )}
              </p>

              <button
                type="button"
                class="btn btn-danger btn-sm"
                onClick={() => {
                  deleteListPicture(listPicture.id);
                }}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ListWords({
  listPictureText,
  items,
  saveNewTexts,
}: {
  listPictureText: ListPictureText;
  items: Item[] | null;
  saveNewTexts: (words: string[]) => void;
}) {
  const { text, foodWords } = listPictureText;
  const [showText, setShowText] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  if (!text) {
    return (
      <p>
        <i>No text found in image 🧐</i>
      </p>
    );
  }

  const alreadyOnListLC = items
    ? items.map((item) => item.text.toLowerCase())
    : [];
  const alreadyOnDoneListLC = items
    ? items.filter((item) => item.done).map((item) => item.text.toLowerCase())
    : [];

  return (
    <div class={style.words}>
      {foodWords && foodWords.length > 0 ? (
        <div>
          <b>Food words found:</b>
          <div class="list-group">
            {foodWords.map((word, i) => {
              const isPicked = picked.includes(word);
              const isDisabled = alreadyOnListLC.includes(word.toLowerCase());
              const isDone = alreadyOnDoneListLC.includes(word.toLowerCase());

              return (
                <button
                  key={word}
                  type="button"
                  class={`list-group-item list-group-item-action ${
                    isPicked ? "list-group-item-success" : ""
                  }`}
                  aria-current={isPicked || undefined}
                  disabled={isDisabled}
                  title={
                    isDone
                      ? "Already on list checked off"
                      : isDisabled
                      ? "Already on your shopping list"
                      : undefined
                  }
                  onClick={() => {
                    if (isPicked) {
                      setPicked((prevState) => {
                        return prevState.filter((w) => w !== word);
                      });
                    } else {
                      setPicked((prevState) => [...prevState, word]);
                    }
                  }}
                >
                  {word}{" "}
                  {isDisabled && (
                    <small>
                      ({isDone ? "already checked off list" : "already on your list"}
                      )
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          <div class={`d-grid gap-2 ${style.add_picked_words_container}`}>
            <button
              type="button"
              class="btn btn-primary"
              disabled={picked.length === 0}
              onClick={() => {
                saveNewTexts(picked);
              }}
            >
              Add{" "}
              <b>
                {picked.length} item{picked.length !== 1 ? "s" : ""}
              </b>{" "}
              to shopping list
            </button>
          </div>
        </div>
      ) : (
        <p>
          <i>No food words found 🤨</i>
        </p>
      )}
      {text !== null && (
        <div class={style.debug_found_foodwords}>
          <p>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setShowText(!showText);
              }}
            >
              {showText ? "Close" : "Show found text"}
            </button>
          </p>
          {showText && <pre style={{ fontSize: "70%" }}>{text}</pre>}
        </div>
      )}
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
  const [hasChanged, setHasChanged] = useState(false);
  useEffect(() => {
    if (notes !== listPicture.notes) {
      setHasChanged(true);
    } else {
      setHasChanged(false);
    }
  }, [notes, listPicture.notes]);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveListPictureNotes(listPicture.id, notes.trim());
      }}
    >
      <div class="input-group mb-3">
        <input
          type="text"
          class="form-control"
          placeholder="Notes"
          aria-label="Notes"
          aria-describedby={`button-addon${listPicture.id}`}
          value={notes}
          onInput={(event) => {
            setNotes(event.currentTarget.value);
          }}
        />
        <button
          class="btn btn-outline-secondary"
          type="submit"
          disabled={!hasChanged}
          id={`button-addon${listPicture.id}`}
        >
          Save
        </button>
      </div>
    </form>
  );
}
