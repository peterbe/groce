import { FunctionalComponent, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import firebase from "firebase/app";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import style from "./style.css";
import { GoBack } from "../../components/go-back";
import { Loading } from "../../components/loading";
import {
  FirestoreFoodWord,
  FoodWord,
  FirestoreSuggestedFoodword,
  SuggestedFoodword,
} from "../../types";

dayjs.extend(relativeTime);

interface Props {
  db: firebase.firestore.Firestore | null;
  user: firebase.User | false | null;
}

function sortFoodWords(
  foodWords: FoodWord[],
  sortBy: string,
  sortReverse: boolean
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

const FoodWords: FunctionalComponent<Props> = ({ db, user }: Props) => {
  useEffect(() => {
    document.title = "Food Words";
  }, []);

  const [foodWords, setFoodWords] = useState<FoodWord[] | null>(null);
  const [foodWordsError, setFoodWordsError] = useState<Error | null>(null);
  const [locale] = useState("en-US");
  const [sortBy, setSortBy] = useState<"word" | "hitCount">("word");
  const [sortReverse, setSortReverse] = useState(false);
  const [suggestedFoodwords, setSuggestedFoodwords] = useState<
    SuggestedFoodword[] | null
  >(null);

  const isAdmin = user && ["peterbe@gmail.com"].includes(user.email || "");

  useEffect(() => {
    if (db && locale) {
      db.collection("foodwords").onSnapshot(
        (snapshot) => {
          const newFoodWords: FoodWord[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreFoodWord;
            newFoodWords.push({
              id: doc.id,
              locale: data.locale,
              word: data.word,
              notes: data.notes,
              hitCount: data.hitCount,
            });
          });
          setFoodWords(sortFoodWords(newFoodWords, "word", false));
        },
        (error) => {
          console.error("Error getting snapshot", error);
          setFoodWordsError(error);
        }
      );
    }
  }, [db, locale]);

  const [showSuggestedFoodwords, setShowSuggestedFoodwords] = useState(false);

  useEffect(() => {
    if (db && locale) {
      db.collection("suggestedfoodwords").onSnapshot(
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
            (a, b) => b.created.seconds - a.created.seconds
          );
          setSuggestedFoodwords(newSuggestedFoodwords);
          if (newSuggestedFoodwords.length === 0) {
            setShowSuggestedFoodwords(false);
          }
        },
        (error) => {
          console.error("Snapshot error:", error);
          // XXX deal better
          // setListPictureTextsError(error);
        }
      );
    }
  }, [db, locale]);

  const [filteredFoodWords, setFilteredFoodWords] = useState<FoodWord[]>([]);
  const [filterWord, setFilterWord] = useState("");
  useEffect(() => {
    if (foodWords) {
      setFilteredFoodWords(
        foodWords.filter((word) => {
          if (filterWord.toLowerCase() === "nonascii") {
            return !/^[ -~]+$/.test(word.word);
          } else if (filterWord) {
            return word.word.toLowerCase().includes(filterWord.toLowerCase());
          }
          return true;
        })
      );
    }
  }, [filterWord, foodWords]);

  useEffect(() => {
    setFilteredFoodWords(sortFoodWords(filteredFoodWords, sortBy, sortReverse));
  }, [filteredFoodWords, sortBy, sortReverse]);

  // useEffect(() => {
  //   if (db && foodWords) {
  //     const dupes: string[] = [];
  //     const seen = new Set();

  //     for (const word of foodWords) {
  //       if (seen.has(word.word)) {
  //         dupes.push(word.id);
  //       } else {
  //         seen.add(word.word);
  //       }
  //     }
  //     var batch = db.batch();
  //     dupes.forEach((id) => {
  //       var ref = db.collection("foodwords").doc(id);
  //       batch.delete(ref);
  //     });
  //     batch.commit();
  //   }
  // }, [db, foodWords]);

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
    const words = foodWords?.map((foodWord) => foodWord.word);
    let text = `// Generated ${new Date().toISOString()}\n`;
    text += `export const FOOD_WORDS = ${JSON.stringify(words, null, 2)};\n`;

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
          Sorry. An error occurred trying to food words.
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
                        if (db) {
                          db.collection("suggestedfoodwords")
                            .doc(suggestedFoodword.id)
                            .delete();
                        }
                      }}
                    >
                      🗑
                    </span>{" "}
                    <span
                      style={{ cursor: "pointer" }}
                      title="Add! (ship it)"
                      onClick={async () => {
                        if (db) {
                          await db.collection("foodwords").add({
                            locale: suggestedFoodword.locale,
                            word: suggestedFoodword.word,
                            hitCount: 0,
                            notes: "",
                          });
                          await db
                            .collection("suggestedfoodwords")
                            .doc(suggestedFoodword.id)
                            .delete();
                        }
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

      <table class="table table-sm table-hover align-middle table-borderless">
        <thead>
          <tr>
            {isAdmin && <th scope="col">Delete</th>}
            <th scope="col">{getSortHeading("word", "Word")}</th>
            <th scope="col">Notes</th>
            <th scope="col">{getSortHeading("hitCount", "Hit count")}</th>
          </tr>
          <tr>
            {isAdmin && <th scope="col" />}
            <th scope="col">
              <input
                type="search"
                class="form-control"
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
            </th>
            <th scope="col" />
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {filteredFoodWords.map((foodWord) => {
            return (
              <tr key={foodWord.id}>
                {isAdmin && (
                  <td>
                    <span
                      style={{ cursor: "pointer" }}
                      title="Delete"
                      onClick={() => {
                        if (db) {
                          db.collection("foodwords")
                            .doc(foodWord.id)
                            .delete()
                            .then(() => {
                              setDeletedWord(foodWord);
                            });
                        }
                      }}
                    >
                      🗑
                    </span>
                  </td>
                )}
                <td>{foodWord.word}</td>
                <td>
                  {foodWord.notes ? <small>{foodWord.notes}</small> : null}
                </td>
                <td>{foodWord.hitCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
    </div>
  );
};

const Outer: FunctionalComponent<Props> = (props: Props) => {
  return (
    <div class={style.food_words}>
      <h1>Food Words</h1>

      <FoodWords {...props} />

      <GoBack />
    </div>
  );
};

export default Outer;

function MassAdd({
  db,
  locale,
  foodWords,
}: {
  db: firebase.firestore.Firestore;
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
          foodWords.map((foodWord) => foodWord.word.toLowerCase())
        );
        const newWords: string[] = [];
        for (let word of newText.split(/\n/g)) {
          word = word.trim();
          if (word.startsWith('"') && word.endsWith('",')) {
            word = word.slice(1, -2);
          } else if (word.startsWith('"') && word.endsWith('"')) {
            word = word.slice(1, -1);
          }
          const wordLC = word.toLowerCase();
          if (!word || seen.has(wordLC) || existingWordsLC.has(wordLC)) {
            continue;
          }
          seen.add(wordLC);
          newWords.push(word);
        }
        if (newWords.length) {
          setSaving(newWords.length);
          await Promise.all(
            newWords.map((word) => {
              return db.collection("foodwords").add({
                locale,
                word,
                hitCount: 0,
                notes: "",
              });
            })
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
