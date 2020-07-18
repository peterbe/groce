import { FunctionalComponent, h } from "preact";
import * as style from "./style.css";
import firebase from "firebase/app";

interface Props {
  user: firebase.User | null;
  auth: firebase.auth.Auth | null;
}

const Home: FunctionalComponent<Props> = (props: Props) => {
  const { user, auth } = props;
  return (
    <div class={style.home}>
      <h1>Home</h1>
      {/* Not sure what the point of installing FirebaseUI is
      https://firebase.google.com/docs/auth/web/firebaseui?authuser=0#initialize_firebaseui
       */}
      User: {user ? <b>{user.displayName}</b> : <i>No user</i>}
      {user && auth && (
        <p>
          <button
            type="button"
            onClick={async () => {
              await auth.signOut();
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
            Sign in (popup)
          </button>
        </p>
      )}
      {!user && auth && (
        <p>
          <button
            type="button"
            onClick={async () => {
              // console.log(auth);
              const provider = new firebase.auth.GoogleAuthProvider();
              try {
                await auth.signInWithRedirect(provider);
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

export default Home;
