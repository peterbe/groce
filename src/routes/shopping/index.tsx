import { FunctionalComponent, h, JSX } from "preact";
import { Link } from "preact-router";
import { useState, useEffect } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";

interface Props {
  user: firebase.User | null;
  db: firebase.firestore.Firestore | null;
}

interface FirestoreList {
  name: string;
  notes: string;
}

interface List extends FirestoreList {
  id: string;
  name: string;
  notes: string;
}

const Shopping: FunctionalComponent<Props> = ({ user, db }: Props) => {
  // function Shopping({ user, db }: Props) {

  const [lists, setLists] = useState<List[] | null>(null);

  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupNotes, setNewGroupNotes] = useState("");

  useEffect(() => {
    if (lists && lists.length) {
      document.title = `(${lists.length}) Shopping lists`;
    } else {
      document.title = "Shopping lists";
    }
  }, [lists]);

  useEffect(() => {
    let shoppinglistsDbRef: () => void;
    if (db && user) {
      shoppinglistsDbRef = db
        .collection("shoppinglists")
        .where("owners", "array-contains", user.uid)
        .onSnapshot((snapshot) => {
          const newLists: List[] = [];
          snapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            const data = doc.data() as FirestoreList;
            newLists.push({
              id: doc.id,
              name: data.name,
              notes: data.notes || "",
            });
          });

          // XXX What we could do is newLists.length ===0 is to forcibly
          // create a first default one.
          if (!newLists.length) {
            console.log("Consider creating one!");
          }

          setLists(newLists);
        });
    }
    return () => {
      if (shoppinglistsDbRef) {
        console.log("Detach shoppinglists db ref listener");
        shoppinglistsDbRef();
      }
    };
  }, [db, user]);

  async function createNewGroup() {
    console.log("CREATE NEW GROUP", newGroupName);
    if (db && user) {
      try {
        await db.collection("shoppinglists").add({
          name: newGroupName,
          notes: newGroupNotes,
          owners: [user.uid],
        });
        setShowNewGroupModal(false);
      } catch (error) {
        console.error("Error creating shopping list:", error);
        // XXX
      }
    }
  }

  return (
    <div class={style.shopping}>
      <h2>
        Shopping lists{" "}
        {lists && lists.length && (
          <small class="text-muted">({lists.length})</small>
        )}
      </h2>

      {!lists && db && user && <div>Loading shopping lists...</div>}

      {lists && !lists.length && (
        <p>You currently don&apos;t have any lists.</p>
      )}
      {lists && (
        <div class="list-group">
          {lists.map((list) => {
            return (
              <Link
                key={list.id}
                href={`/shopping/${list.id}`}
                class="list-group-item list-group-item-action"
              >
                {list.name}
              </Link>
            );
          })}
        </div>
      )}

      <hr />
      <button
        type="button"
        class="btn btn-secondary"
        data-toggle="modal"
        data-target="#newGroupModal"
        onClick={() => {
          setShowNewGroupModal(true);
        }}
      >
        Create new group
      </button>

      {/* <div class="row">
        <div class="col-sm-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">New group</h5>
              <p class="card-text">
                You can create new groups
              </p>
              <button
                type="button"
                class="btn btn-secondary"
                data-toggle="modal"
                data-target="#newGroupModal"
                onClick={(event) => {
                  setShowNewGroupModal(true);
                }}
              >
                Create new group
              </button>
            </div>
          </div>
        </div>
      </div> */}

      <div
        class={showNewGroupModal ? "modal fade show" : "modal fade"}
        id="newGroupModal"
        aria-labelledby="exampleModalLabel"
        aria-hidden={!showNewGroupModal ? "true" : null}
        style={showNewGroupModal ? { display: "block" } : {}}
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="exampleModalLabel">
                New shopping group
              </h5>
              <button
                type="button"
                class="close"
                data-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  setShowNewGroupModal(false);
                }}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  await createNewGroup();
                }}
              >
                <div class="mb-3">
                  <label htmlFor="groupName" class="form-label">
                    Group name
                  </label>
                  <input
                    value={newGroupName}
                    onInput={({
                      currentTarget,
                    }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                      setNewGroupName(currentTarget.value);
                    }}
                    type="text"
                    class="form-control"
                    placeholder="for example: Hardware store"
                    id="groupName"
                    aria-describedby="groupNameHelp"
                  />
                  <div id="groupNameHelp" class="form-text">
                    You can change the name later.
                  </div>
                </div>
                <div class="mb-3">
                  <label htmlFor="groupNotes" class="form-label">
                    Notes/Description
                  </label>
                  <input
                    value={newGroupNotes}
                    onInput={({
                      currentTarget,
                    }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                      setNewGroupNotes(currentTarget.value);
                    }}
                    type="text"
                    class="form-control"
                    id="groupNotes"
                    aria-describedby="groupNotesHelp"
                  />
                  <div id="groupNotesHelp" class="form-text">
                    Just in case you need it and it helps.
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-dismiss="modal"
                onClick={() => {
                  setShowNewGroupModal(false);
                }}
              >
                Close
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={!newGroupName.trim()}
                onClick={async () => {
                  await createNewGroup();
                }}
              >
                Create group
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shopping;
