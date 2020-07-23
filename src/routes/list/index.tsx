import { JSX, h } from "preact";
import { Link } from "preact-router";
import { useState, useEffect } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";

interface Props {
  user: firebase.User | null;
  db: firebase.firestore.Firestore | null;
  id: string;
}

interface ItemGroup {
  order: number;
  text: string;
}

interface FirestoreItem {
  text: string;
  description: string;
  group: ItemGroup;
  done: boolean;
  removed: boolean;
}

interface Item extends FirestoreItem {
  id: string;
}

interface FirestoreList {
  name: string;
  notes: string;
}

interface List extends FirestoreList {
  id: string;
}

function List({ user, db, id }: Props) {
  const [items, setItems] = useState<Item[] | null>(null);

  const [list, setList] = useState<List | null>(null);
  const [listNotFound, setListNotFound] = useState(false);
  const [listError, setListError] = useState<Error | null>(null);
  const [itemsError, setItemsError] = useState<Error | null>(null);

  const [newText, setNewText] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!newText.trim()) {
      setSearchSuggestions([]);
    } else if (items) {
      const escaped = newText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rex = new RegExp(`\\b${escaped}`, "i");
      setSearchSuggestions(
        items
          .filter((item) => item.removed && rex.test(item.text))
          .map((item) => item.text)
      );
    }
  }, [newText, items]);

  useEffect(() => {
    if (listNotFound) {
      document.title = "🤮 Shopping list not found";
    } else if (listError) {
      document.title = `List error!`;
    } else if (list) {
      document.title = list.notes
        ? `${list.name} (${list.notes})`
        : `${list.name}`;
    } else {
      document.title = "Shopping list";
    }
  }, [list, listNotFound, listError]);

  useEffect(() => {
    if (db && user && id) {
      db.collection("shoppinglists")
        .doc(id)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const data = doc.data() as FirestoreList;
            setList({
              id: doc.id,
              name: data && data.name,
              notes: data && data.notes,
            });
          } else {
            setListNotFound(true);
          }
        })
        .catch((error) => {
          console.error("Error getting document:", error);
          setListError(error);
        });
    }
  }, [db, user, id]);

  useEffect(() => {
    let listDbRef: () => void;
    if (user && db && list) {
      listDbRef = db.collection(`shoppinglists/${id}/items`).onSnapshot(
        (snapshot) => {
          const newItems: Item[] = [];
          snapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            const data = doc.data() as FirestoreItem;

            newItems.push({
              id: doc.id,
              text: data.text,
              description: data.description,
              done: data.done,
              group: data.group,
              removed: data.removed,
            });
          });

          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              console.log("Added: ", change.doc.data());
            }
            if (change.type === "modified") {
              console.log("Modified city: ", change.doc.data());
            }
            if (change.type === "removed") {
              console.log("Removed city: ", change.doc.data());
            }
          });

          setItems(newItems);
        },
        (error) => {
          console.error("Snapshot error:", error);
          setItemsError(error);
        }
      );
    }
    return () => {
      if (listDbRef) {
        console.log("Detach list db ref listener");
        listDbRef();
      }
    };
  }, [list, user, db]);

  async function updateItemDoneToggle(item: Item) {
    if (db) {
      try {
        await db.collection(`shoppinglists/${id}/items`).doc(item.id).update({
          done: !item.done,
        });
      } catch (error) {
        console.error("Unable to update:", error);
      }
    } else {
      console.warn("DB not available");
    }
  }

  async function addNewText() {
    if (!newText.trim()) {
      throw new Error("new text empty");
    }
    if (db && items) {
      // If the exact same text has been used before, reuse it
      const previousItem = items.find(
        (item) => item.text.toLowerCase() === newText.toLowerCase()
      );
      // console.log({ previousItem });
      if (previousItem) {
        // Update it as not removed and not done
        try {
          await db
            .collection(`shoppinglists/${id}/items`)
            .doc(previousItem.id)
            .set({
              text: newText.trim(),
              description: previousItem.description,
              group: previousItem.group,
              done: false,
              removed: false,
            });
          setNewText("");
          setNewDescription("");
        } catch (error) {
          console.error("Unable to update:", error);
          throw error;
        }
      } else {
        // A fresh add
        try {
          await db.collection(`shoppinglists/${id}/items`).add({
            text: newText.trim(),
            description: newDescription.trim(),
            group: {
              order: items.length + 1,
              text: "",
            },
            done: false,
            removed: false,
          });
          // console.log(newDocRef);
          setNewText("");
          setNewDescription("");
        } catch (error) {
          console.error("Unable to add:", error);
          throw error;
        }
      }
    } else {
      console.warn("DB not available");
    }
  }

  if (listNotFound) {
    return (
      <Alert
        heading={"Shopping list not found"}
        message={
          <p>
            No list by the ID <code>{id}</code>
          </p>
        }
      />
    );
  }
  if (listError) {
    return (
      <Alert
        heading={"List error"}
        message={
          <p>
            List error: <code>{listError.toString()}</code>{" "}
          </p>
        }
      />
    );
  }

  return (
    <div class={style.list}>
      {list && (
        <h2>
          {list.name}{" "}
          {list.notes && <small class="text-muted">{list.notes}</small>}
        </h2>
      )}
      {itemsError && (
        <Alert
          heading="List items error"
          message={
            <p>
              Items error: <code>{itemsError.toString()}</code>
            </p>
          }
        />
      )}
      {items && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await addNewText();
          }}
        >
          <div class="input-group">
            <input
              type="search"
              class="form-control"
              value={newText}
              onInput={({
                currentTarget,
              }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                setNewText(currentTarget.value);
              }}
              aria-label="Text input with segmented dropdown button"
              placeholder="Add new item..."
            />
            <button
              type="button"
              class="btn btn-outline-secondary"
              disabled={!newText.trim()}
              onClick={addNewText}
            >
              Add
            </button>
          </div>
        </form>
      )}

      {items && (
        <div>
          {searchSuggestions.length ? (
            <p>
              {searchSuggestions.map((suggestion) => {
                return (
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    key={suggestion}
                    style={{ marginRight: 5 }}
                    onClick={() => {
                      setNewText(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                );
              })}
              ?
            </p>
          ) : (
            <p>&nbsp;</p>
          )}
        </div>
      )}

      {/* COnsider this format instead:
            https://v5.getbootstrap.com/docs/5.0/forms/input-group/#checkboxes-and-radios */}
      {items && (
        <ul class="list-group">
          {items.map((item) => {
            return (
              <li class="list-group-item" key={item.id}>
                <input
                  class="form-check-input mr-1"
                  id={`checkbox${item.id}`}
                  type="checkbox"
                  checked={item.done}
                  onClick={async () => {
                    await updateItemDoneToggle(item);
                  }}
                  aria-label="..."
                />
                <label htmlFor={`checkbox${item.id}`}>{item.text}</label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default List;

function Alert({
  heading,
  message,
}: {
  heading: string;
  message: string | JSX.Element;
}) {
  return (
    <div class={style.list}>
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">{heading}</h4>
        {message}
        <hr />
        <p class="mb-0">
          <Link href="/shopping">
            Go back to list of <b>shopping lists</b> to try again
          </Link>
        </p>
      </div>
    </div>
  );
}
