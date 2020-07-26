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
      <div class="text-center">
        <h1 class="display-1">That&apos;s Groce!</h1>
        <p class="lead">Planning shopping and meals for the family.</p>
        {/* <h2>Dashboard</h2>
      <h3>Shopping lists</h3> */}

        {user && (
          <div class={style.login}>
            <p>
              Logged in as <b>{user.displayName}</b>{" "}
              {user.email && <span>({user.email})</span>}
            </p>
          </div>
        )}

        {user && (
          <div class={style.options}>
            <p>
              <Link href="/shopping" class="btn btn-primary btn-lg btn-block">
                Shopping lists
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
                  // console.log(auth);
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
