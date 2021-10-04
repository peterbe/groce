import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { route } from "preact-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import smoothscroll from "smoothscroll-polyfill";

import { User } from "firebase/auth";
import {
  doc,
  Firestore,
  onSnapshot,
  Unsubscribe,
  collection,
  addDoc,
  query,
  where,
  Timestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { FirebaseStorage } from "firebase/storage";
import style from "./style.css";
import { Loading } from "../../../components/loading";
import { FileUpload } from "../../../components/file-upload";
import { Alert } from "../../../components/alerts";
import {
  List,
  Item,
  ListPicture,
  FirestoreListPicture,
  ListPictureText,
  FirestoreListPictureText,
  FirestoreSuggestedFoodword,
  SuggestedFoodword,
  FirestoreListWordOption,
  ListWordOption,
} from "../../../types";
import { DisplayImage } from "../../../components/display-image";
// import { useToasts } from "../../../toasts-context";

dayjs.extend(relativeTime);

if (typeof window !== "undefined") {
  smoothscroll.polyfill();
}

type TabState = "uploads" | "options" | "suggested";

export function Pictures({
  db,
  storage,
  user,
  ready,
  items,
  list,
  saveHandler,
  openImageModal,
}: {
  db: Firestore;
  storage: FirebaseStorage;
  user: User;
  ready: boolean;
  list: List;
  items: Item[] | null;
  saveHandler: (text: string) => Promise<void>;
  openImageModal: (url: string) => void;
}): h.JSX.Element {
  // const { addToast } = useToasts();

  const [listPictures, setListPictures] = useState<ListPicture[] | null>(null);
  // useEffect(() => {
  //   if (listPictures === null) {
  //     addToast("It's null!");
  //   } else {
  //     addToast({
  //       header: `${listPictures.length} list pictures`,
  //       body: "Body here!",
  //     });
  //   }
  // }, [listPictures]);
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
    const collectionRef = collection(db, `shoppinglists/${list.id}/pictures`);
    const unsubscribe = onSnapshot(
      query(collectionRef),
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
            imageThumbnailData: data.imageThumbnailData,
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
      unsubscribe();
    };
  }, [db, list]);

  // Set up watcher on /texts collection
  useEffect(() => {
    const collectionRef = collection(db, `shoppinglists/${list.id}/texts`);
    const unsubscribe = onSnapshot(
      query(collectionRef),
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
      unsubscribe();
    };
  }, [db, list]);

  const [suggestedFoodwords, setSuggestedFoodwords] = useState<
    SuggestedFoodword[] | null
  >(null);
  const [suggestedFoodwordsError, setSuggestedFoodwordsError] =
    useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: null | Unsubscribe = null;
    if (user) {
      const collectionRef = collection(db, "suggestedfoodwords");
      unsubscribe = onSnapshot(
        query(collectionRef, where("creator_uid", "==", user.uid)),
        (snapshot) => {
          const newSuggestedFoodwords: Omit<
            SuggestedFoodword,
            "creator_email" | "creator_uid"
          >[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreSuggestedFoodword;
            newSuggestedFoodwords.push({
              id: doc.id,
              locale: data.locale,
              word: data.word,
              created: data.created,
            });
          });
          newSuggestedFoodwords.sort(
            (a, b) =>
              b.created.toDate().getTime() - a.created.toDate().getTime()
          );
          setSuggestedFoodwords(newSuggestedFoodwords);
        },
        (error) => {
          console.error("Snapshot error:", error);
          setSuggestedFoodwordsError(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      );
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [db, user]);

  const [listWordOptions, setListWordOptions] = useState<
    ListWordOption[] | null
  >(null);

  // Set up watcher on /wordoptions collection
  useEffect(() => {
    const collectionRef = collection(
      db,
      `shoppinglists/${list.id}/wordoptions`
    );
    const unsubscribe = onSnapshot(
      query(collectionRef),
      (snapshot) => {
        const newListWordOptions: ListWordOption[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as FirestoreListWordOption;
          const item = {
            id: doc.id,
            word: data.word,
            alias: data.alias,
            ignore: data.ignore,
            modified: data.modified,
            created: data.created,
          };
          newListWordOptions.push(item);
        });
        newListWordOptions.sort((a, b) => {
          if (a.alias && !b.alias) {
            return -1;
          } else if (b.alias && !a.alias) {
            return 1;
          }
          return a.word.localeCompare(b.word);
        });
        setListWordOptions(newListWordOptions);
      },
      (error) => {
        console.error("Snapshot error:", error);
        // setListPictureTextsError(error);
        // XXX deal with this better
      }
    );
    return () => {
      unsubscribe();
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

  async function saveListPictureNotes(id: string, notes: string) {
    try {
      await updateDoc(doc(db, `shoppinglists/${list.id}/pictures`, id), {
        notes,
        modified: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error(`Error trying to update picture notes ${list.id}:`, error);
      setSaveListPictureError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async function deleteListPicture(id: string) {
    try {
      await updateDoc(doc(db, `shoppinglists/${list.id}/pictures`, id), {
        deleted: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error(`Error trying to delete picture ${list.id}:`, error);
      setSaveListPictureError(
        error instanceof Error ? error : new Error(String(error))
      );
      return;
    }
    setUndoableDelete(id);
  }

  async function undeleteListPicture(id: string) {
    try {
      await updateDoc(doc(db, `shoppinglists/${list.id}/pictures`, id), {
        deleted: null,
      });
    } catch (error) {
      setSaveListPictureError(error as Error);
      return;
    }
    setUndoableDelete(null);
    // return db
    //   .collection(`shoppinglists/${list.id}/pictures`)
    //   .doc(id)
    //   .update({
    //     deleted: null,
    //   })
    //   .then(() => {
    //     setUndoableDelete(null);
    //   })
    //   .catch((error) => {
    //     setSaveListPictureError(error);
    //   });
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
      <div class={style.new_upload}>
        {!uploadedFiles.size && (!listPictures || listPictures.length === 0) && (
          <div>
            <p>
              Click "Choose File" to upload a picture of ingredients you're
              planning and perhaps you need to buy.
            </p>
          </div>
        )}
        <FileUpload
          db={db}
          storage={storage}
          list={list}
          disabled={!ready}
          item={null}
          prefix="list-pictures"
          onUploaded={({
            file,
            filePath,
          }: {
            file: File;
            filePath: string;
          }) => {
            const newMap: Map<string, File> = new Map(uploadedFiles);
            newMap.set(filePath, file);
            setUploadedFiles(newMap);
          }}
        />
      </div>

      {listPicturesError && (
        <Alert
          heading="An error occurred trying to fetch your pictures."
          message={listPicturesError}
          type="danger"
          offerReload={true}
        />
      )}

      {listPictureTextsError && !listPicturesError && (
        <Alert
          heading="An error occurred trying to fetch your picture texts."
          message={listPictureTextsError}
          offerReload={true}
          type="danger"
        />
      )}

      {saveListPictureError && (
        <Alert
          heading="An error occurred trying to save."
          message={saveListPictureError}
          type="danger"
        />
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

      {tab === "options" && db && (
        <FoodwordOptions
          db={db}
          list={list}
          listWordOptions={listWordOptions}
        />
      )}

      {tab === "suggested" && (
        <ShowSuggestedFoodwords
          suggestedFoodwordsError={suggestedFoodwordsError}
          suggestedFoodwords={suggestedFoodwords}
          addSuggestion={async (word: string) => {
            addDoc(collection(db, "suggestedfoodwords"), {
              word,
              locale: "en-US",
              creator_uid: user.uid,
              creator_email: user.email,
              created: Timestamp.fromDate(new Date()),
            });
          }}
          removeSuggestions={async (ids: string[]) => {
            await Promise.all(
              ids.map((id) => {
                return deleteDoc(doc(db, "suggestedfoodwords", id));
              })
            );
          }}
        />
      )}
    </div>
  );
}

function FoodwordOptions({
  list,
  listWordOptions,
  db,
}: {
  list: List;
  listWordOptions: ListWordOption[] | null;
  db: Firestore;
}) {
  const [saving, setSaving] = useState(false);
  const [word, setWord] = useState("");
  const [action, setAction] = useState<"ignore" | "alias">("ignore");
  const [alias, setAlias] = useState("");
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  async function saveNewWord() {
    const existing: string[] = [];
    if (listWordOptions) {
      existing.push(...listWordOptions.map((o) => o.word.toLowerCase()));
    }

    if (existing.includes(word.trim().toLowerCase())) {
      setSaveError(new Error(`'${word}' already added`));
      return;
    }
    if (action === "alias" && !alias.trim()) {
      setSaveError(new Error("No alias word entered"));
      return;
    }
    const newWordOption: FirestoreListWordOption = {
      word: word.trim(),
      modified: Timestamp.fromDate(new Date()),
      created: Timestamp.fromDate(new Date()),
    };
    if (action === "alias") {
      newWordOption.alias = alias.trim();
    } else {
      newWordOption.ignore = true;
    }

    try {
      await addDoc(
        collection(db, `shoppinglists/${list.id}/wordoptions`),
        newWordOption
      );
    } catch (error) {
      setSaveError(error as Error);
    }
  }

  async function removeWords(ids: string[]) {
    await Promise.all(
      ids.map((id) => {
        return deleteDoc(doc(db, `shoppinglists/${list.id}/wordoptions`, id));
      })
    );
  }

  if (!listWordOptions) {
    return <Loading text="Loading options…" />;
  }
  return (
    <div>
      <h4>Your food word options</h4>
      {listWordOptions.length === 0 ? (
        <p>
          <i>None, yet</i>
        </p>
      ) : (
        <div>
          <ul class="list-group shadow-sm bg-white rounded">
            {listWordOptions.map((listWordOption) => {
              return (
                <li key={listWordOption.id} class="list-group-item">
                  <input
                    class="form-check-input me-1"
                    type="checkbox"
                    value={listWordOption.id}
                    aria-label={`Word: ${listWordOption.word}`}
                    onChange={(event) => {
                      if (event.currentTarget.checked) {
                        setCheckedIds((prevState) => {
                          return [listWordOption.id, ...prevState];
                        });
                      } else {
                        setCheckedIds((prevState) => {
                          return prevState.filter(
                            (id) => id !== listWordOption.id
                          );
                        });
                      }
                    }}
                  />
                  {listWordOption.word}{" "}
                  {listWordOption.alias ? (
                    <span>
                      <i style={{ color: "#898989" }}>alias to:</i>{" "}
                      {listWordOption.alias}
                    </span>
                  ) : (
                    <i style={{ color: "#898989" }}>always ignored</i>
                  )}
                </li>
              );
            })}
          </ul>
          {checkedIds.length > 0 && (
            <button
              type="button"
              class="btn btn-warning"
              onClick={async () => {
                await removeWords(checkedIds);
                setCheckedIds([]);
              }}
            >
              Remove selected words
            </button>
          )}
        </div>
      )}

      <h4 style={{ marginTop: 30 }}>Set up a new food word option</h4>

      {saveError && (
        <Alert
          heading="Error trying to save new food word option"
          message={saveError}
          type="danger"
        />
      )}

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!word.trim()) {
            return;
          }
          setSaving(true);
          try {
            await saveNewWord();
          } finally {
            setSaving(false);
            setWord("");
            setAlias("");
          }
        }}
      >
        <div class="mb-3">
          <label for="id_newword" class="form-label">
            Word
          </label>
          <input
            type="text"
            class="form-control"
            id="id_newword"
            placeholder="For example, Salt"
            value={word}
            onInput={(event) => {
              setWord(event.currentTarget.value);
            }}
            aria-describedby="newwordHelp"
          />
          <div id="newwordHelp" class="form-text">
            Case is <i>not</i> important
          </div>
        </div>
        <div class="form-check">
          <input
            class="form-check-input"
            type="radio"
            id="id_ignore"
            checked={action === "ignore"}
            onClick={() => {
              setAction("ignore");
            }}
          />
          <label class="form-check-label" for="id_ignore">
            Ignore
          </label>
        </div>
        <div class="form-check">
          <input
            class="form-check-input"
            type="radio"
            id="id_alias"
            checked={action === "alias"}
            onClick={() => {
              setAction("alias");
            }}
          />
          <label class="form-check-label" for="id_alias">
            Alias
          </label>
        </div>
        {action === "alias" && (
          <div class="mb-3">
            <label for="id_alias" class="form-label">
              Alias
            </label>
            <input
              type="text"
              class="form-control"
              id="id_alias"
              placeholder="Red pepper"
              value={alias}
              onInput={(event) => {
                setAlias(event.currentTarget.value);
              }}
            />
          </div>
        )}
        <button
          type="submit"
          class="btn btn-primary"
          disabled={saving || !word.trim()}
        >
          Save new food word option
        </button>
      </form>
    </div>
  );
}

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
    <div class={style.tabs_container} role="group" aria-label="Tabs">
      <a
        class={`btn btn-sm ${
          tab === "uploads" ? "btn-outline-primary" : "btn-outline-secondary"
        }`}
        aria-current={tab === "uploads" ? "page" : undefined}
        href="#uploads"
        onClick={() => {
          onChange("uploads");
        }}
      >
        Uploads{" "}
        {countListPictures > 0 && (
          <small class="fw-light">({countListPictures})</small>
        )}
      </a>{" "}
      <a
        class={`btn btn-sm ${
          tab === "options" ? "btn-outline-primary" : "btn-outline-secondary"
        }`}
        aria-current={tab === "options" ? "page" : undefined}
        href="#options"
        onClick={() => {
          onChange("options");
        }}
      >
        Options
      </a>{" "}
      <a
        class={`btn btn-sm ${
          tab === "suggested" ? "btn-outline-primary" : "btn-outline-secondary"
        }`}
        aria-current={tab === "suggested" ? "page" : undefined}
        href="#suggested"
        onClick={() => {
          onChange("suggested");
        }}
      >
        {countSuggestedFoodwords ? `Suggested` : "Suggest"}{" "}
        {countSuggestedFoodwords > 0 && (
          <small>({countSuggestedFoodwords})</small>
        )}
      </a>
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
  suggestedFoodwordsError,
}: {
  suggestedFoodwords: SuggestedFoodword[] | null;
  addSuggestion: (word: string) => Promise<void>;
  removeSuggestions: (ids: string[]) => Promise<void>;
  suggestedFoodwordsError: Error | null;
}) {
  const [newText, setNewText] = useState("");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  return (
    <div class={style.suggested_foodwords}>
      {suggestedFoodwordsError && (
        <Alert
          heading="Error loading your food words"
          message={suggestedFoodwordsError}
          type="danger"
          linkToHomepage={false}
          offerReload={true}
        />
      )}
      {suggestedFoodwords && suggestedFoodwords.length > 0 ? (
        <div class={style.your_suggested_words}>
          <p>Your suggested words:</p>
          <div class="list-group list-group-flush">
            {suggestedFoodwords.map((suggestedFoodword) => {
              return (
                <label class="list-group-item" key={suggestedFoodword.id}>
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
  saveNewTexts: (words: string[]) => Promise<void>;
}) {
  return (
    <div class={style.list_pictures}>
      {listPictures.map((listPicture) => {
        const listPictureText = listPictureTexts.get(listPicture.filePath);
        return (
          <div class={style.picture_group} key={listPicture.id}>
            <NotesForm
              listPicture={listPicture}
              saveListPictureNotes={saveListPictureNotes}
            />

            <div class="container">
              <div class="row">
                <div class="col-sm">
                  <DisplayImage
                    filePath={listPicture.filePath}
                    file={uploadedFiles.get(listPicture.filePath)}
                    placeholderImageData={
                      listPicture.imageThumbnailData
                        ? listPicture.imageThumbnailData
                        : undefined
                    }
                    maxWidth={450}
                    maxHeight={450}
                    openImageModal={openImageModal}
                    className="img-fluid rounded img-thumbnail"
                  />
                </div>
                <div class="col-sm">
                  {listPictureText ? (
                    <div>
                      <ListWords
                        listPictureText={listPictureText}
                        items={items}
                        saveNewTexts={saveNewTexts}
                      />
                    </div>
                  ) : (
                    // Based on a very rough estimate how long it usually takes
                    <div>
                      <DisplayFakeProgressbar time={6 * 1000} />
                      <p>Analyzing photo to find words in the text.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p>
              <small class="fw-light">
                Added: {dayjs(listPicture.created.toDate()).fromNow()}
              </small>
              <br />
              {listPicture.created.seconds !== listPicture.modified.seconds && (
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
          </div>
        );
      })}
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
  saveNewTexts: (words: string[]) => Promise<void>;
}) {
  const { text, foodWords } = listPictureText;
  const [showText, setShowText] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const selfRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const age =
      (new Date().getTime() - listPictureText.created.toDate().getTime()) /
      1000;
    if (age < 1 && selfRef.current) {
      selfRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [listPictureText]);

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
    <div class={style.words} ref={selfRef}>
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
                  {(isDone || isDisabled) && <span role="icon">✔️ </span>}
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
              onClick={async () => {
                setAdding(true);
                await saveNewTexts(picked);
                setAdding(false);
              }}
            >
              {adding && (
                <span
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
              )}{" "}
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
