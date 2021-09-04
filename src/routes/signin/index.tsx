import { FunctionalComponent, Fragment, h } from "preact";
import { useState } from "preact/hooks";
import { route } from "preact-router";
import style from "./style.css";
import firebase from "firebase/app";

import { GoBack } from "../../components/go-back";
import { Alert } from "../../components/alerts";

interface Props {
  user: firebase.User | false | null;
  auth: firebase.auth.Auth | null;
}

const Signin: FunctionalComponent<Props> = (props: Props) => {
  const { user, auth } = props;
  const [signInError, setSignInError] = useState<Error | null>(null);
  return (
    <div>
      <h2>{user && !user.isAnonymous ? "You are signed in" : "Sign in"}</h2>

      {signInError && <Alert heading="Sign in error" message={signInError} />}
      {user && !user.isAnonymous && (
        <p>
          Currently signed in as <b>{user.displayName}</b>
        </p>
      )}

      {user && !user.isAnonymous && auth && (
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
      {(!user || user.isAnonymous) && auth && (
        <Fragment>
          <p style={{ marginTop: 10 }}>
            <button
              type="button"
              class="btn btn-primary btn-lg"
              onClick={async () => {
                const provider = new firebase.auth.GoogleAuthProvider();
                if (user && user.isAnonymous) {
                  try {
                    await user.linkWithPopup(provider);
                    route("/", true);
                  } catch (error) {
                    setSignInError(
                      error instanceof Error ? error : new Error(String(error))
                    );
                  }
                } else {
                  try {
                    await auth.signInWithPopup(provider);
                    route("/", true);
                  } catch (error) {
                    setSignInError(
                      error instanceof Error ? error : new Error(String(error))
                    );
                  }
                }
              }}
            >
              Sign in with Google
            </button>
          </p>
          {/* {user && user.isAnonymous && (
            <p>
              <small>Your temporary data will be saved.</small>
            </p>
          )} */}
        </Fragment>
      )}
      {user && user.isAnonymous && (
        <p style={{ marginTop: 50 }}>
          <button
            type="button"
            class="btn btn-warning btn-sm"
            onClick={async () => {
              if (auth) {
                try {
                  await auth.signOut();
                } catch (error) {
                  console.error("Unable to sign out", error);
                }
              }
            }}
          >
            Discard temporary data
          </button>
          <br />
          <small>Because you are &quot;temporarily signed in&quot;</small>.
        </p>
      )}
      <GoBack />
    </div>
  );
};

const SigninOuter: FunctionalComponent<Props> = (props: Props) => {
  return (
    <div class={style.signin}>
      <Signin {...props} />
    </div>
  );
};

export default SigninOuter;
