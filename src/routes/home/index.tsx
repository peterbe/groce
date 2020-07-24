import { FunctionalComponent, h } from "preact";
import { Link } from "preact-router";
import * as style from "./style.css";
import firebase from "firebase/app";

interface Props {
  db: firebase.firestore.Firestore | null;
  user: firebase.User | null;
  auth: firebase.auth.Auth | null;
}

const Home: FunctionalComponent<Props> = (props: Props) => {
  const { user, auth } = props;

  return (
    <div class={style.home}>
      <h2>Dashboard</h2>
      <h3>Shopping lists</h3>
      {user && (
        <div>
          <p>
            Logged in as <b>{user.displayName}</b>{" "}
            {user.email && <span>({user.email})</span>}
          </p>
        </div>
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
