import { FunctionalComponent, h } from "preact";
import { route } from "preact-router";
import * as style from "./style.css";
import firebase from "firebase/app";

interface Props {
  user: firebase.User | null;
  auth: firebase.auth.Auth | null;
}

const Signin: FunctionalComponent<Props> = (props: Props) => {
  const { user, auth } = props;
  return (
    <div class={style.signin}>
      <h2>Sign in</h2>
      {/* Not sure what the point of installing FirebaseUI is
      https://firebase.google.com/docs/auth/web/firebaseui?authuser=0#initialize_firebaseui
       */}
      User: {user ? <b>{user.displayName}</b> : <i>No user</i>}
      {user && auth && (
        <p>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={async () => {
              await auth.signOut();
              route("/", true);
            }}
          >
            Sign out
          </button>
        </p>
      )}
      {!user && auth && (
        <p>
          <button
            type="button"
            class="btn btn-primary"
            onClick={async () => {
              // console.log(auth);
              const provider = new firebase.auth.GoogleAuthProvider();
              try {
                await auth.signInWithPopup(provider);
                route("/", true);
              } catch (error) {
                console.log("ERROR:", error);
              }
            }}
          >
            Sign in (popup)
          </button>
        </p>
      )}
      {!user && auth && (
        <p>
          <button
            type="button"
            class="btn btn-primary"
            onClick={async () => {
              // console.log(auth);
              const provider = new firebase.auth.GoogleAuthProvider();
              try {
                await auth.signInWithRedirect(provider);
                route("/", true);
              } catch (error) {
                console.log("ERROR:", error);
              }
            }}
          >
            Sign in (redirect)
          </button>
        </p>
      )}
    </div>
  );
};

export default Signin;
