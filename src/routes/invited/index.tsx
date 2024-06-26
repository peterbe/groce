import { FunctionalComponent, h } from "preact";
import { Link, route } from "preact-router";
import { useEffect, useState } from "preact/hooks";
import { User } from "firebase/auth";
import {
  doc,
  Firestore,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import style from "./style.css";
import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { List, Invitation, FirestoreInvitation } from "../../types";

interface Props {
  db: Firestore | null;
  user: User | false | null;
  lists: List[] | null;
  listID: string;
  invitationID: string;
}

const Invited: FunctionalComponent<Props> = (props: Props) => {
  const { listID, invitationID, user, db, lists } = props;

  useEffect(() => {
    document.title = "Invitation";
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("invitationID", `${listID}/${invitationID}`);
    } catch (error) {
      console.error("Unable to set sessionStorage item", error);
    }
  }, [listID, invitationID]);

  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (lists) {
      setWaiting(false);
    }
  }, [lists]);

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [invitationError, setInvitationError] = useState<Error | null>(null);

  useEffect(() => {
    if (user && lists && db) {
      // const collectionRef = collection(db, `shoppinglists/${listID}/invitations`);
      const docRef = doc(
        db,
        `shoppinglists/${listID}/invitations`,
        invitationID,
      );
      getDoc(docRef).then(
        (doc) => {
          if (doc.exists()) {
            const data = doc.data() as FirestoreInvitation;
            setInvitation(
              Object.assign(
                {
                  id: doc.id,
                },
                data,
              ),
            );
            // Was it your own invitation?
            if (data.inviter_uid === user.uid) {
              if (sessionStorage.getItem("invitationID")) {
                try {
                  // get rid of it
                  sessionStorage.removeItem("invitationID");
                } catch (error) {
                  console.warn(
                    "Unable to get rid of sessionStorage item",
                    error,
                  );
                }
              }
            }
          } else {
            setInvitationError(new Error("Invite does not exist"));
          }
        },
        (error) => {
          console.error("Invite doc error:", error);
          setInvitationError(error);
        },
      );
    }
  }, [db, listID, invitationID, user, lists]);

  async function acceptInvite() {
    if (db && user && invitation) {
      const accepted = [...(invitation.accepted || [])];
      if (!accepted.includes(user.uid)) {
        // const docRef = doc(
        //   db,
        //   `shoppinglists/${listID}/invitations`,
        //   invitation.id
        // );

        // getDoc(docRef).then()
        try {
          await updateDoc(
            doc(db, `shoppinglists/${listID}/invitations`, invitation.id),
            {
              accepted: arrayUnion(user.uid),
              accepted_names: arrayUnion(
                user.displayName || user.email || user.uid,
              ),
            },
          );
        } catch (error) {
          console.error("Error adding self to invitation", error);
          setInvitationError(error as Error);
        } finally {
          setWaiting(true);
        }

        try {
          sessionStorage.removeItem("invitationID");
        } catch (error) {
          console.warn("Unable remove item from sessionStorage", error);
        }
      } else {
        // Undo.
        try {
          await updateDoc(
            doc(db, `shoppinglists/${listID}/invitations`, invitation.id),
            {
              accepted: arrayRemove(user.uid),
              accepted_names: arrayRemove(
                user.displayName || user.email || user.uid,
              ),
            },
          );

          // XXX update UI with something
          console.log("Removed self from invitation");
        } catch (error) {
          console.error("Error removing self from invitation", error);
          setInvitationError(error as Error);
        } finally {
          setWaiting(true);
        }
      }
    } else {
      throw new Error("Can't accept invite yet");
    }
  }

  async function discardInvitation() {
    if (db && user && invitation && invitation.email === user.email) {
      await deleteDoc(doc(db, "shoppinglists", invitation.id));
      console.log("Invitation discarded");
      route("/");
    }
  }

  // Default is to say it's loading
  let inner = (
    <div class="text-center">
      <div class="spinner-border m-5" role="status">
        <span class="sr-only">Loading...</span>
      </div>
      <p>Loading...</p>
    </div>
  );
  if (user === false) {
    inner = (
      <div class="alert alert-info" role="alert">
        <h4 class="alert-heading">Not signed in yet</h4>
        <p>Before you can accept this invitation, you need to sign in.</p>
        <p>
          <b>Use the menu bar to sign in</b> and when you&apos;re done,
          you&apos;ll come back to this page.
        </p>
        <hr />
        <p class="mb-0">Will need to verify the invitation.</p>
      </div>
    );
  } else if (invitationError) {
    inner = (
      <Alert
        heading="Invitation error"
        message={invitationError}
        offerReload={true}
      />
    );
  } else if (invitation) {
    if (
      invitation.email &&
      user &&
      invitation.email.toLowerCase() !== (user.email || "").toLowerCase()
    ) {
      inner = (
        <Alert
          heading="Not for your email"
          message={`The invitation was for a specific email address and not for yours (${
            user.email || ""
          })`}
          type="warning"
        />
      );
    } else if (user && invitation.inviter_uid === user.uid) {
      inner = (
        <Alert
          heading="This is your own invitation"
          message="You're viewing an invitation you yourself created."
          type="warning"
        />
      );
    } else if (invitation.expires.toDate() < new Date()) {
      inner = (
        <Alert
          heading="Invitation has expired"
          message={`Ask ${invitation.about.inviter} to create a new invite maybe?`}
          type="warning"
        />
      );
    } else if (lists && lists.map((list) => list.id).includes(listID)) {
      try {
        sessionStorage.removeItem("invitationID");
      } catch (error) {
        console.warn("Unable to remove item from sessionStorage", error);
      }
      discardInvitation();
      inner = (
        <div>
          <Alert
            heading="You're already in this list"
            message=""
            type="success"
          />

          <ShowYourLists lists={lists} />
        </div>
      );
    } else {
      inner = (
        <div>
          <p>
            You&apos;ve been invited by <b>{invitation.about.inviter_name}</b>{" "}
            to shopping list <b>{invitation.about.name}</b>{" "}
            {invitation.about.notes && (
              <small>({invitation.about.notes})</small>
            )}
          </p>
          <div class="d-grid gap-2">
            <button
              type="button"
              class="btn btn-primary btn-lg"
              onClick={() => {
                acceptInvite();
              }}
            >
              {waiting && (
                <span
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
              )}
              {waiting && <span class="sr-only">Loading...</span>} Accept
            </button>
            <Link href="/" class="btn btn-info">
              Cancel/Ignore
            </Link>
          </div>
          <ShowAcceptedUsers accepted={invitation.accepted} user={user} />
        </div>
      );
    }
  }

  return (
    <div class={style.invited}>
      <div class="text-center">
        <h2>Invitation</h2>
        {inner}
      </div>

      <GoBack />
    </div>
  );
};

export default Invited;

function ShowAcceptedUsers({
  accepted,
  user,
}: {
  accepted: string[];
  user: User | null;
}) {
  if (!accepted || !accepted.length) {
    return null;
  }
  if (user && accepted.includes(user.uid)) {
    return <p>You have accepted the invitation.</p>;
  }

  return (
    <div>
      {accepted.map((a) => {
        return (
          <p key={a}>
            Previously accepted by <b>{a}</b>
          </p>
        );
      })}
    </div>
  );
}

function ShowYourLists({ lists }: { lists: List[] }) {
  if (!lists) {
    return null;
  }
  return (
    <div>
      <h4>Your lists</h4>
      <div class="d-grid gap-2">
        {lists.map((list) => {
          return (
            <a
              key={list.id}
              href={`/shopping/${list.id}`}
              class="btn btn-outline-info"
            >
              {list.name}
            </a>
          );
        })}
      </div>
    </div>
  );
}
