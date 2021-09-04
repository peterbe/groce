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
  FirestoreSuggestedFoodword,
  SuggestedFoodword,
} from "../../../types";
import { DisplayImage } from "../../../components/display-image";

dayjs.extend(relativeTime);

interface Props {
  db: firebase.firestore.Firestore;
  storage: firebase.storage.Storage;
  user: firebase.User;
  ready: boolean;
  list: List;
  items: Item[] | null;
  saveHandler: (text: string) => Promise<void>;
  openImageModal: (url: string) => void;
}
type TabState = "uploads" | "options" | "suggested";

export const Pictures: FunctionalComponent<Props> = ({
  db,
  storage,
  user,
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
  const [tab, setTab] = useState<TabState>("uploads");
  useEffect(() => {
    const { hash } = window.location;
    if (["#uploads", "#options", "#suggested"].includes(hash)) {
      setTab(hash.slice(1) as TabState);
    }
  }, []);

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
        // Most recently created first
        newListPictures.sort((a, b) => b.created.seconds - a.created.seconds);

        setListPictures(newListPictures);
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

  const [suggestedFoodwords, setSuggestedFoodwords] = useState<
    SuggestedFoodword[] | null
  >(null);

  useEffect(() => {
    let ref: () => void;
    if (user) {
      ref = db
        .collection("suggestedfoodwords")
        .where("creator_uid", "==", user.uid)
        .onSnapshot(
          (snapshot) => {
            const newSuggestedFoodwords: SuggestedFoodword[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data() as FirestoreSuggestedFoodword;
              newSuggestedFoodwords.push({
                id: doc.id,
                word: data.word,
                created: data.created,
                creator_uid: data.creator_uid,
              });
            });
            newSuggestedFoodwords.sort(
              (a, b) =>
                b.created.toDate().getTime() - a.created.toDate().getTime()
            );
            setSuggestedFoodwords(newSuggestedFoodwords);
            // setListPictureTexts(newListPictureTexts);
          },
          (error) => {
            console.error("Snapshot error:", error);
            // XXX deal better
            // setListPictureTextsError(error);
          }
        );
    }
    return () => {
      if (ref) ref();
    };
  }, [db, user]);

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

      <Tabs
        onChange={(tab: TabState) => setTab(tab)}
        tab={tab}
        countListPictures={listPictures ? listPictures.length : 0}
        countSuggestedFoodwords={
          suggestedFoodwords ? suggestedFoodwords.length : 0
        }
      />

      {listPictures && tab === "uploads" && (
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
      {tab === "suggested" && (
        <ShowSuggestedFoodwords
          suggestedFoodwords={suggestedFoodwords}
          addSuggestion={async (word: string) => {
            await db.collection("suggestedfoodwords").add({
              word,
              creator_uid: user.uid,
              created: firebase.firestore.Timestamp.fromDate(new Date()),
            });
          }}
          removeSuggestions={async (ids: string[]) => {
            await Promise.all(
              ids.map((id) => {
                return db.collection("suggestedfoodwords").doc(id).delete();
              })
            );
          }}
        />
      )}
    </div>
  );
};

function Tabs({
  tab,
  onChange,
  countListPictures,
  countSuggestedFoodwords,
}: {
  tab: TabState;
  onChange: (tab: TabState) => void;
  countListPictures: number;
  countSuggestedFoodwords: number;
}) {
  return (
    <div class={style.tabs_container}>
      <ul class="nav nav-pills nav-fill">
        <li class="nav-item">
          <a
            class={tab === "uploads" ? "nav-link active" : "nav-link"}
            aria-current={tab === "uploads" ? "page" : undefined}
            href="#uploads"
            onClick={() => {
              onChange("uploads");
            }}
          >
            Uploads{" "}
            <small>{countListPictures ? `(${countListPictures})` : ""}</small>
          </a>
        </li>

        <li class="nav-item">
          <a
            class={tab === "options" ? "nav-link active" : "nav-link"}
            aria-current={tab === "options" ? "page" : undefined}
            href="#options"
            onClick={() => {
              onChange("options");
            }}
          >
            Options
          </a>
        </li>
        <li class="nav-item">
          <a
            class={tab === "suggested" ? "nav-link active" : "nav-link"}
            aria-current={tab === "suggested" ? "page" : undefined}
            href="#suggested"
            onClick={() => {
              onChange("suggested");
            }}
          >
            Suggested{" "}
            <small>
              {countSuggestedFoodwords ? `(${countSuggestedFoodwords})` : ""}
            </small>
          </a>
        </li>
      </ul>
    </div>
  );
}

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

function ShowSuggestedFoodwords({
  suggestedFoodwords,
  addSuggestion,
  removeSuggestions,
}: {
  suggestedFoodwords: SuggestedFoodword[] | null;
  addSuggestion: (word: string) => Promise<void>;
  removeSuggestions: (ids: string[]) => Promise<void>;
}) {
  const [newText, setNewText] = useState("");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  return (
    <div class={style.suggested_foodwords}>
      {suggestedFoodwords && suggestedFoodwords.length > 0 ? (
        <div class={style.your_suggested_words}>
          <p>Your suggested words:</p>
          <div class="list-group list-group-flush">
            {suggestedFoodwords.map((suggestedFoodword) => {
              return (
                <label class="list-group-item">
                  <input
                    class="form-check-input me-1"
                    type="checkbox"
                    value={suggestedFoodword.id}
                    checked={checkedIds.includes(suggestedFoodword.id)}
                    onChange={() => {
                      if (checkedIds.includes(suggestedFoodword.id)) {
                        setCheckedIds(
                          checkedIds.filter((id) => id !== suggestedFoodword.id)
                        );
                      } else {
                        setCheckedIds([...checkedIds, suggestedFoodword.id]);
                      }
                    }}
                  />
                  {"  "}
                  {suggestedFoodword.word}{" "}
                  <small class="fw-light">
                    ({dayjs(suggestedFoodword.created.toDate()).fromNow()})
                  </small>
                </label>
              );
            })}
          </div>
          {checkedIds.length > 0 && (
            <button
              type="button"
              class="btn btn-warning"
              onClick={async () => {
                await removeSuggestions(checkedIds);
                setCheckedIds([]);
              }}
            >
              Remove selected suggestions
            </button>
          )}
        </div>
      ) : (
        <p>
          You can help yourself and everyone else by{" "}
          <b>suggesting appropriate food words</b> that the picture scanner
          couldn't find. It's very much appreciated!
        </p>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!newText.trim()) {
            return;
          }
          const existing = new Set(
            suggestedFoodwords?.map((s) => s.word.toLowerCase())
          );
          if (existing.has(newText.trim().toLowerCase())) {
            return;
          }
          await addSuggestion(newText.trim());
          setNewText("");
        }}
      >
        <div class="mb-3">
          <label htmlFor="id_suggestion" class="form-label">
            Your new suggestion:
          </label>
          <input
            type="text"
            class="form-control"
            id="id_suggestion"
            aria-describedby="suggestionHelp"
            value={newText}
            onInput={(event) => {
              setNewText(event.currentTarget.value);
            }}
          />
          <div id="suggestionHelp" class="form-text">
            For example: <i>Crunchy Stew Sticks</i>
          </div>
        </div>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={!newText.trim()}
        >
          Submit suggestion
        </button>
      </form>
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
                className="img-fluid rounded img-thumbnail"
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
                // <div class="spinner-border" role="status">
                //   <span class="visually-hidden">
                //     Loading text from picture...
                //   </span>
                // </div>
                // Based on a very rough estimate how long it usually takes
                <DisplayFakeProgressbar time={5 * 1000} />
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

function DisplayFakeProgressbar({ time }: { time: number }) {
  const [startDate] = useState(new Date());
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(() => {
      const elapsed = new Date().getTime() - startDate.getTime();
      const ratio = (100 * elapsed) / time;
      if (mounted) {
        setPercent(Math.ceil(Math.min(99, ratio)));
      }
      if (ratio >= 100) {
        clearInterval(interval);
      }
    }, 200);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [time, startDate]);
  return (
    <div class="progress">
      <div
        class="progress-bar progress-bar-striped progress-bar-animated"
        role="progressbar"
        aria-valuenow={`${percent}`}
        aria-valuemin="0"
        aria-valuemax="100"
        style={{ width: `${percent}%` }}
      />
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
    ? items
        .filter((item) => !item.removed)
        .map((item) => item.text.toLowerCase())
    : [];
  const alreadyOnDoneListLC = items
    ? items
        .filter((item) => !item.removed && item.done)
        .map((item) => item.text.toLowerCase())
    : [];

  return (
    <div class={style.words}>
      {foodWords && foodWords.length > 0 ? (
        <div>
          <b>Food words found:</b>
          <div class="list-group">
            {foodWords.map((word) => {
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
                      (
                      {isDone
                        ? "already checked off list"
                        : "already on your list"}
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
