import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { User } from "firebase/auth";
import {
  doc,
  Firestore,
  onSnapshot,
  collection,
  addDoc,
  query,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";

import style from "./style.css";
import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { Loading } from "../../components/loading";
import { FUNCTION_BASE_URL, USE_EMULATOR } from "../../function-utils";
import {
  FirestoreFoodWord,
  FoodWord,
  FirestoreSuggestedFoodword,
  SuggestedFoodword,
} from "../../types";

dayjs.extend(relativeTime);

function sortFoodWords(
  foodWords: FoodWord[],
  sortBy: string,
  sortReverse: boolean,
) {
  return foodWords.sort((a, b) => {
    const reverse = sortReverse ? -1 : 1;
    if (sortBy === "hitCount") {
      const cmp = reverse * (a.hitCount - b.hitCount);
      if (cmp !== 0) {
        return cmp;
      }
    }
    return reverse * a.word.localeCompare(b.word);
  });
}

function FoodWords({ db, user }: { db: Firestore; user: User | false | null }) {
  useEffect(() => {
    document.title = "Food Words";
  }, []);

  const [foodWords, setFoodWords] = useState<FoodWord[] | null>(null);
  const [foodWordsError, setFoodWordsError] = useState<Error | null>(null);
  const [suggestedFoodWordsError, setSuggestedFoodWordsError] =
    useState<Error | null>(null);
  const [locale] = useState("en-US");
  const [sortBy, setSortBy] = useState<"word" | "hitCount">("word");
  const [sortReverse, setSortReverse] = useState(false);
  const [suggestedFoodwords, setSuggestedFoodwords] = useState<
    SuggestedFoodword[] | null
  >(null);

  const isAdmin = user && ["peterbe@gmail.com"].includes(user.email || "");

  useEffect(() => {
    const collectionRef = collection(db, "foodwords");
    const unsubscribe = onSnapshot(
      query(collectionRef),
      (snapshot) => {
        const newFoodWords: FoodWord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as FirestoreFoodWord;
          newFoodWords.push({
            id: doc.id,
            locale: data.locale,
            word: data.word,
            aliasTo: data.aliasTo,
            hitCount: data.hitCount,
          });
        });
        setFoodWords(sortFoodWords(newFoodWords, "word", false));
      },
      (error) => {
        console.error("Error getting snapshot", error);
        setFoodWordsError(error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [db, locale]);

  const [showSuggestedFoodwords, setShowSuggestedFoodwords] = useState(false);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (user && !user.isAnonymous) {
      const collectionRef = collection(db, "suggestedfoodwords");
      unsubscribe = onSnapshot(
        query(collectionRef),
        (snapshot) => {
          const newSuggestedFoodwords: SuggestedFoodword[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreSuggestedFoodword;
            newSuggestedFoodwords.push({
              id: doc.id,
              word: data.word,
              locale: data.locale,
              created: data.created,
              creator_uid: data.creator_uid,
              creator_email: data.creator_email,
            });
          });
          newSuggestedFoodwords.sort(
            (a, b) => b.created.seconds - a.created.seconds,
          );
          setSuggestedFoodwords(newSuggestedFoodwords);
          if (newSuggestedFoodwords.length === 0) {
            setShowSuggestedFoodwords(false);
          }
        },
        (error) => {
          console.error("Snapshot error:", error);
          setSuggestedFoodWordsError(error);
        },
      );
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [db, locale, user]);

  const [filteredFoodWords, setFilteredFoodWords] = useState<FoodWord[]>([]);
  const [filterWord, setFilterWord] = useState("");
  useEffect(() => {
    if (foodWords) {
      const filterWordLC = filterWord.toLowerCase().trim();
      setFilteredFoodWords(
        foodWords.filter((word) => {
          if (filterWordLC === "aliasto") {
            return Boolean(word.aliasTo);
          } else if (filterWordLC === "nonascii") {
            return (
              word.word !==
              word.word.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            );
          } else if (filterWordLC) {
            return (
              word.word.toLowerCase().includes(filterWordLC) ||
              (word.aliasTo &&
                word.aliasTo.toLowerCase().includes(filterWordLC))
            );
          }
          return true;
        }),
      );
    }
  }, [filterWord, foodWords]);

  useEffect(() => {
    setFilteredFoodWords(sortFoodWords(filteredFoodWords, sortBy, sortReverse));
  }, [filteredFoodWords, sortBy, sortReverse]);

  async function deleteDuplicateFoodwords(db: Firestore, words: FoodWord[]) {
    const dupes: string[] = [];
    const seen = new Set();

    for (const word of words) {
      if (seen.has(word.word)) {
        dupes.push(word.id);
      } else {
        seen.add(word.word);
      }
    }
    if (dupes.length === 0) {
      return;
    }
    console.log(`${dupes.length} dupes to delete`);
    const batch = writeBatch(db);
    dupes.forEach((id) => {
      const itemRef = doc(db, "foodwords", id);
      batch.delete(itemRef);
    });
    await batch.commit();
  }

  useEffect(() => {
    if (foodWords && isAdmin) {
      deleteDuplicateFoodwords(db, foodWords);
    }
  }, [db, foodWords, isAdmin]);

  const [deletedWord, setDeletedWord] = useState<FoodWord | null>(null);
  useEffect(() => {
    let mounted = true;
    if (deletedWord) {
      setTimeout(() => {
        if (mounted) {
          setDeletedWord(null);
        }
      }, 3000);
    }
    return () => {
      mounted = false;
    };
  }, [deletedWord]);

  function getSortHeading(key: "word" | "hitCount", text: string) {
    return (
      <span
        class={
          sortBy === key
            ? sortReverse
              ? style.sortable_on_reverse
              : style.sortable_on
            : style.sortable
        }
        onClick={(event) => {
          event.preventDefault();
          if (sortBy === key) {
            setSortReverse(!sortReverse);
          } else {
            setSortBy(key);
          }
        }}
      >
        {text}
      </span>
    );
  }

  function downloadToFile(fileName = "sample-food-words.ts") {
    const words = foodWords?.map((foodWord) => {
      if (foodWord.aliasTo) {
        return { word: foodWord.word, aliasTo: foodWord.aliasTo };
      }
      return { word: foodWord.word };
    });
    let text = `// Generated ${new Date().toISOString()}\n\n`;
    text += `type FoodWordInfo = {
  word: string;
  aliasTo?: string;
};\n`;
    text += `export const FOOD_WORDS: FoodWordInfo[] = ${JSON.stringify(
      words,
      null,
      2,
    )};\n`;

    const a = document.createElement("a");
    a.style.cssText = "display: none";
    document.body.appendChild(a);
    const blob = new Blob([text], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.parentElement?.removeChild(a);
  }

  if (!foodWords) {
    return <Loading text="Loading..." />;
  }

  return (
    <div>
      <h3>
        Locale: <b>{locale}</b> (
        <small>{foodWords.length.toLocaleString()} words in total</small>)
      </h3>

      {foodWordsError && (
        <div
          class="alert alert-danger alert-dismissible fade show"
          role="alert"
        >
          Sorry. An error occurred trying fetch food words.
          <br />
          <a
            href="/foodwords"
            class="btn btn-warning"
            onClick={(event) => {
              event.preventDefault();
              window.location.reload();
            }}
          >
            Reload
          </a>
          <br />
          <code>{foodWordsError.toString()}</code>
          <button
            type="button"
            class="btn-close btn-small"
            data-bs-dismiss="alert"
            aria-label="Close"
            onClick={() => {
              setFoodWordsError(null);
            }}
          />
        </div>
      )}

      {suggestedFoodWordsError && (
        <div
          class="alert alert-danger alert-dismissible fade show"
          role="alert"
        >
          Sorry. An error occurred trying to fetch suggested food words.
          <br />
          <a
            href="/foodwords"
            class="btn btn-warning"
            onClick={(event) => {
              event.preventDefault();
              window.location.reload();
            }}
          >
            Reload
          </a>
          <br />
          <code>{suggestedFoodWordsError.toString()}</code>
          <button
            type="button"
            class="btn-close btn-small"
            data-bs-dismiss="alert"
            aria-label="Close"
            onClick={() => {
              setSuggestedFoodWordsError(null);
            }}
          />
        </div>
      )}

      {deletedWord && (
        <p>
          Deleted <b>{deletedWord.word}</b>
        </p>
      )}

      {isAdmin && suggestedFoodwords && suggestedFoodwords.length > 0 && (
        <button
          type="button"
          class="btn btn-outline-primary"
          onClick={() => {
            setShowSuggestedFoodwords(!showSuggestedFoodwords);
          }}
        >
          {showSuggestedFoodwords ? "Hide" : "Show"} suggested foodwords (
          {suggestedFoodwords.length})
        </button>
      )}
      {isAdmin && showSuggestedFoodwords && suggestedFoodwords && (
        <table
          class="table table-sm table-hover align-middle table-borderless"
          style={{ marginBottom: 50 }}
        >
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Word</th>
              <th scope="col">Locale</th>
              <th scope="col">Suggested by</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {suggestedFoodwords.map((suggestedFoodword) => {
              return (
                <tr key={suggestedFoodword.id}>
                  <td>
                    <span
                      style={{ cursor: "pointer" }}
                      title="Delete"
                      onClick={async () => {
                        if (!db) {
                          return;
                        }
                        await deleteDoc(
                          doc(db, "suggestedfoodwords", suggestedFoodword.id),
                        );
                      }}
                    >
                      🗑
                    </span>{" "}
                    <span
                      style={{ cursor: "pointer" }}
                      title="Add! (ship it)"
                      onClick={async () => {
                        await addDoc(collection(db, "foodwords"), {
                          locale: suggestedFoodword.locale,
                          word: suggestedFoodword.word,
                          hitCount: 0,
                          notes: "",
                        });

                        await deleteDoc(
                          doc(db, "suggestedfoodwords", suggestedFoodword.id),
                        );
                      }}
                    >
                      🛳
                    </span>
                  </td>
                  <td>{suggestedFoodword.word}</td>
                  <td>{suggestedFoodword.locale}</td>
                  <td>{suggestedFoodword.creator_email}</td>
                  <td title={suggestedFoodword.created.toDate().toISOString()}>
                    {dayjs(suggestedFoodword.created.toDate()).fromNow()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginBottom: 10 }}>
        <input
          type="search"
          aria-describedby="searchHelp"
          class="form-control"
          placeholder="Search..."
          value={filterWord}
          onInput={(event) => {
            if (event.currentTarget.value === "") {
              setFilterWord("");
            }
          }}
          onChange={(event) => {
            setFilterWord(event.currentTarget.value);
          }}
        />
        <div id="searchHelp" class="form-text">
          Possible magic search words:{" "}
          <code
            onClick={() => {
              if (filterWord === "aliasto") {
                setFilterWord("");
              } else {
                setFilterWord("aliasto");
              }
            }}
          >
            aliasto
          </code>
          ,{" "}
          <code
            onClick={() => {
              if (filterWord === "nonascii") {
                setFilterWord("");
              } else {
                setFilterWord("nonascii");
              }
            }}
          >
            nonascii
          </code>
        </div>
      </div>

      <table class="table table-sm table-hover align-middle table-borderless">
        <thead>
          <tr>
            {isAdmin && <th scope="col">Delete</th>}
            <th scope="col">{getSortHeading("word", "Word")}</th>
            <th scope="col">{getSortHeading("hitCount", "Hit count")}</th>
          </tr>
        </thead>
        <tbody>
          {filteredFoodWords.map((foodWord) => {
            const stringNormalized = foodWord.word
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            return (
              <tr key={foodWord.id}>
                {isAdmin && (
                  <td>
                    <span
                      style={{ cursor: "pointer" }}
                      title="Delete"
                      onClick={async () => {
                        await deleteDoc(doc(db, "foodwords", foodWord.id));
                      }}
                    >
                      🗑
                    </span>
                  </td>
                )}
                <td>
                  {foodWord.word}
                  {foodWord.aliasTo && (
                    <span
                      class="badge bg-secondary"
                      style={{ marginLeft: 5, marginRight: 5 }}
                    >
                      alias to:
                    </span>
                  )}
                  {foodWord.aliasTo && <i>{foodWord.aliasTo}</i>}
                  {foodWord.word !== stringNormalized && (
                    <span
                      class="badge bg-secondary"
                      style={{ marginLeft: 5, marginRight: 5 }}
                    >
                      implied alias of:
                    </span>
                  )}
                  {foodWord.word !== stringNormalized && (
                    <i>{stringNormalized}</i>
                  )}
                </td>
                <td>{foodWord.hitCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filterWord && filteredFoodWords.length === 0 && (
        <p>
          <i>Nothing found</i>
        </p>
      )}
      {db && foodWords && isAdmin && (
        <p>
          <a
            href="download"
            download="test-sample-food-words.ts"
            onClick={(event) => {
              event.preventDefault();
              downloadToFile();
            }}
          >
            Download as TypeScript file
          </a>
        </p>
      )}

      {db && foodWords && isAdmin && (
        <MassAdd db={db} foodWords={foodWords} locale={locale} />
      )}
      {db && foodWords && isAdmin && USE_EMULATOR && <SampleLoad />}
    </div>
  );
}

export default function Outer({
  db,
  user,
}: {
  db: Firestore | null;
  user: User | false | null;
}): h.JSX.Element {
  return (
    <div class={style.food_words}>
      <h1>Food Words</h1>

      {db ? (
        <FoodWords db={db} user={user} />
      ) : (
        <Loading text="Loading app..." />
      )}

      <GoBack />
    </div>
  );
}

function SampleLoad() {
  const [loading, setLoading] = useState(false);
  const [totalWords, setTotalWords] = useState<null | number>(null);
  const [totalCounter, setTotalCounter] = useState<null | number>(null);
  const [samples, setSamples] = useState<null | number>(null);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  const [postingError, setPostingError] = useState<Error | null>(null);

  const functionURL = `${FUNCTION_BASE_URL}/loadSampleFoodWords/`;

  useEffect(() => {
    fetch(functionURL).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        setTotalWords(data.totalWords);
        setSamples(data.samples);
      } else {
        setLoadingError(new Error(`${response.status} on ${functionURL}`));
      }
    });
  }, []);

  return (
    <div style={{ marginTop: 20, marginBottom: 40 }}>
      {loadingError && (
        <Alert heading="Loading sample words error" message={loadingError} />
      )}
      {postingError && (
        <Alert heading="Loading sample words error" message={postingError} />
      )}
      {totalWords && totalWords > 0 ? (
        <p>{totalWords.toLocaleString()} sample words loaded</p>
      ) : (
        <button
          class="btn btn-outline-primary"
          disabled={Boolean(loading || totalCounter)}
          onClick={async (event) => {
            event.preventDefault();
            setLoading(true);
            try {
              const r = await fetch(functionURL, { method: "POST" });
              if (r.ok) {
                const data = await r.json();
                setTotalCounter(data.totalCounter);
              } else {
                setPostingError(new Error(`${r.status} on ${functionURL}`));
              }
            } finally {
              setLoading(false);
            }
          }}
        >
          {totalCounter !== null && totalCounter > 0 ? (
            <span>Loaded {totalCounter?.toLocaleString()}</span>
          ) : loading ? (
            <i>Loading...</i>
          ) : (
            <span>
              Load from samples{" "}
              {samples !== null && `(${samples.toLocaleString()})`}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function MassAdd({
  db,
  locale,
  foodWords,
}: {
  db: Firestore;
  locale: string;
  foodWords: FoodWord[];
}) {
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  const [savedNewWords, setSavedNewWords] = useState(0);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const seen = new Set();
        const existingWordsLC = new Set(
          foodWords.map((foodWord) => foodWord.word.toLowerCase()),
        );
        const newWords: {
          word: string;
          aliasTo: string;
        }[] = [];
        for (let word of newText.split(/\n/g)) {
          word = word.trim();
          if (word.startsWith('"') && word.endsWith('",')) {
            word = word.slice(1, -2);
          } else if (word.startsWith('"') && word.endsWith('"')) {
            word = word.slice(1, -1);
          }
          let aliasTo = "";
          if (word.includes("=>")) {
            aliasTo = word.split("=>")[1].trim();
            word = word.split("=>")[0].trim();
          }
          const wordLC = word.toLowerCase();
          if (!word || seen.has(wordLC) || existingWordsLC.has(wordLC)) {
            continue;
          }
          seen.add(wordLC);
          newWords.push({ word, aliasTo });
        }
        if (newWords.length) {
          setSaving(newWords.length);
          await Promise.all(
            newWords.map(({ word, aliasTo }) => {
              return addDoc(collection(db, "foodwords"), {
                locale,
                word,
                hitCount: 0,
                aliasTo,
              });
            }),
          );

          setSavedNewWords(newWords.length);
          setSaving(null);
        }
        setNewText("");
      }}
    >
      <div class="mb-3" style={{ marginTop: 50 }}>
        <label for="id_new_words" class="form-label">
          Mass add
        </label>
        <textarea
          id="id_new_words"
          class="form-control"
          value={newText}
          rows={10}
          onChange={(event) => {
            setNewText(event.currentTarget.value);
          }}
        />
        <div class="form-text">Comma separated list of words.</div>
      </div>
      <div class="mb-3">
        <label for="id_locale" class="form-label">
          Locale
        </label>
        <input
          type="text"
          class="form-control"
          id="id_locale"
          disabled={true}
          value={locale}
        />
      </div>
      <button type="submit" class="btn btn-primary" disabled={Boolean(saving)}>
        {saving && (
          <span
            class="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          />
        )}
        {saving ? " Saving..." : "Submit"}
      </button>

      {savedNewWords > 0 && <p>Saved {savedNewWords} new words</p>}
      {saving && <p>Saving {saving} new words</p>}
    </form>
  );
}
