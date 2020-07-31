import { FunctionalComponent, h } from "preact";
import { Link } from "preact-router";
import * as style from "./style.css";
import firebase from "firebase/app";

import { List } from "../../types";
import { useEffect, useState } from "preact/hooks";

interface Props {
  db: firebase.firestore.Firestore | null;
  user: firebase.User | null;
  auth: firebase.auth.Auth | null;
  lists: List[] | null;
}

const Home: FunctionalComponent<Props> = (props: Props) => {
  const { user, auth, lists } = props;

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

        <PendingInvite user={user} />

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

        {!user && auth && (
          <div class={style.login}>
            <p>
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
            </p>
            <p>
              <button
                type="button"
                class="btn btn-primary"
                onClick={async () => {
                  const provider = new firebase.auth.GoogleAuthProvider();
                  try {
                    await auth.signInWithRedirect(provider);
                  } catch (error) {
                    console.log("ERROR:", error);
                  }
                }}
              >
                Sign in with Google (redirect)
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

function PendingInvite({ user }: { user: firebase.User | null }) {
  const [inviteID, setInviteID] = useState<string | null>(null);
  useEffect(() => {
    try {
      const id = sessionStorage.getItem("invitedID");
      if (id) {
        setInviteID(id);
      }
    } catch (error) {
      console.error("Error trying to get sessionStorage item", error);
    }
  }, [user]);

  if (!inviteID) {
    return null;
  }
  return (
    <div class="alert alert-primary alert-dismissible fade show" role="alert">
      You have a pending invite.{" "}
      {user ? (
        <Link href={`/invited/${inviteID}`}>
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
          sessionStorage.removeItem("invitedID");
          setInviteID(null);
        }}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
