import { FunctionalComponent, h } from "preact";
import { Link } from "preact-router";
import * as style from "./style.css";
import firebase from "firebase/app";
import { useEffect, useState } from "preact/hooks";

import { Alert } from "../../components/alerts";
import { Loading } from "../../components/loading";
import { List, FirestoreInvitation, Invitation } from "../../types";

interface Props {
  user: firebase.User | false | null;
  auth: firebase.auth.Auth | null;
  db: firebase.firestore.Firestore | null;
  lists: List[] | null;
}

const Home: FunctionalComponent<Props> = (props: Props) => {
  const { user, auth, lists, db } = props;

  // If set, this string will be something like `<ID_OF_LIST>/<ID_OF_INVITATION>`
  const [invitationIdentifier, setInvitationIdentifier] = useState<
    string | null
  >(null);
  useEffect(() => {
    if (db) {
      try {
        const identifier = sessionStorage.getItem("invitationID");
        if (identifier) {
          const [listID, invitationID] = identifier.split("/");
          db.collection(`shoppinglists/${listID}/invitations`)
            .doc(invitationID)
            .onSnapshot(
              (doc) => {
                if (doc.exists) {
                  setInvitationIdentifier(identifier);
                } else {
                  console.warn("Invitation, by identifier, does not exist");
                }
              },
              (error) => {
                console.error("Error getting invitation by identifier", error);
              }
            );
        }
      } catch (error) {
        console.error("Error trying to get sessionStorage item", error);
      }
    }
  }, [user, db]);

  const [invitations, setInvitations] = useState<Invitation[] | null>(null);

  // Are there any standing invitations in my name?
  useEffect(() => {
    let ref: () => void;

    if (db && user && user.email && lists) {
      db.collectionGroup("invitations")
        .where("email", "==", user.email.toLowerCase())
        .onSnapshot(
          (snapshot) => {
            const newInvitations: Invitation[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data() as FirestoreInvitation;
              if (new Date() > data.expires.toDate()) {
                return;
              }
              if (user.uid === data.inviter_uid) {
                // Your own invitation
                return;
              }
              if (data.accepted.includes(user.uid)) {
                return;
              }
              newInvitations.push({
                id: doc.id,
                email: data.email,
                added: data.added,
                expires: data.expires,
                inviter_uid: data.inviter_uid,
                about: data.about,
                accepted: data.accepted,
              });
            });
            setInvitations(newInvitations);
          },
          (error) => {
            console.error("Error getting invitations snapshot", error);
          }
        );
    }
    return () => {
      if (ref) {
        ref();
      }
    };
  }, [db, user, lists]);

  const [signinError, setSigninError] = useState<Error | null>(null);

  const hasInvitationByID =
    invitations &&
    invitationIdentifier &&
    invitations.map((i) => i.id).includes(invitationIdentifier.split("/")[1]);

  return (
    <div class={style.home}>
      <div class="text-center">
        <h1 class="display-1">That&apos;s Groce!</h1>
        <p class="lead">Planning shopping and meals for the family.</p>

        {user && (
          <div class={style.login}>
            <p>
              Logged in as <b>{user.displayName}</b>{" "}
              {user.email && <span>({user.email})</span>}
            </p>
          </div>
        )}

        {invitationIdentifier && !hasInvitationByID && (
          <PendingInvitation
            invitationID={invitationIdentifier}
            user={user}
            close={() => {
              setInvitationIdentifier(null);
              try {
                sessionStorage.removeItem("invitationID");
              } catch (error) {
                console.error(
                  "Unable to delete invitation ID from session Storage",
                  error
                );
              }
            }}
          />
        )}
        {invitations && user && (
          <PendingInvitations invitations={invitations} />
        )}

        {user && (
          <div class={style.options}>
            <p>
              <Link href="/shopping" class="btn btn-primary btn-lg btn-block">
                Shopping lists
                {lists && ` (${lists.length})`}
              </Link>
            </p>
            <p>
              <Link
                href="#"
                class="btn btn-secondary btn-lg btn-block"
                disabled
                title="Not working yet"
              >
                Meal planning
              </Link>
              <i>
                <small>Under construction</small>
              </i>
            </p>
          </div>
        )}

        {user === null && <Loading />}

        {auth && user === false && (
          <div class={style.login}>
            {/* <p>
              <button
                type="button"
                class="btn btn-primary"
                onClick={async () => {
                  // console.log(auth);
                  const provider = new firebase.auth.GoogleAuthProvider();
                  try {
                    await auth.signInWithPopup(provider);
                  } catch (error) {
                    console.log("ERROR:", error);
                  }
                }}
              >
                Sign in with Google (popup)
              </button>
            </p> */}
            <p>
              <button
                type="button"
                class="btn btn-primary"
                onClick={async () => {
                  const provider = new firebase.auth.GoogleAuthProvider();
                  try {
                    await auth.signInWithRedirect(provider);
                  } catch (error) {
                    console.error("Error signing in with redirect", error);
                    setSigninError(error);
                  }
                }}
              >
                Sign in with Google
              </button>
            </p>
          </div>
        )}

        {signinError && (
          <Alert heading="Sign in error" message={signinError.toString()} />
        )}
      </div>
    </div>
  );
};

export default Home;

function PendingInvitation({
  user,
  invitationID,
  close,
}: {
  user: firebase.User | false | null;
  invitationID: string;
  close: () => void;
}) {
  return (
    <div class="alert alert-primary alert-dismissible fade show" role="alert">
      You have a pending invite.{" "}
      {user ? (
        <Link href={`/invited/${invitationID}`}>
          <b>See invite to accept</b>
        </Link>
      ) : (
        <b>Sign in first to use the invite</b>
      )}
      <button
        type="button"
        class="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={() => {
          close();
        }}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}

function PendingInvitations({ invitations }: { invitations: Invitation[] }) {
  if (!invitations.length) {
    return null;
  }
  return (
    <div>
      {invitations.map((invitation) => (
        <ShowInvitation key={invitation.id} invitation={invitation} />
      ))}
    </div>
  );
}
function ShowInvitation({ invitation }: { invitation: Invitation }) {
  const [close, toggleClose] = useState(false);

  if (close) {
    return null;
  }
  return (
    <div class="alert alert-primary alert-dismissible fade show" role="alert">
      You have a pending invitation from <b>{invitation.about.inviter_name}</b>{" "}
      to a list called <b>{invitation.about.name}</b>.{" "}
      <Link
        href={`/invited/${invitation.about.id}/${invitation.id}`}
        class="btn btn-sm btn-info"
      >
        <b>See invite to accept</b>
      </Link>
      <button
        type="button"
        class="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={() => {
          toggleClose(true);
        }}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
