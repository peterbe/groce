import { Fragment, h } from "preact";
import { useState } from "preact/hooks";
import { route } from "preact-router";
import style from "./style.css";
import {
  Auth,
  User,
  GoogleAuthProvider,
  signInWithRedirect,
  linkWithPopup,
} from "firebase/auth";

import { GoBack } from "../../components/go-back";
import { Alert } from "../../components/alerts";

interface Props {
  user: User | false | null;
  auth: Auth | null;
}

function Signin({ user, auth }: Props) {
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
                const provider = new GoogleAuthProvider();
                if (user && user.isAnonymous) {
                  try {
                    await linkWithPopup(user, provider);
                    // await user.linkWithPopup(provider);
                    route("/", true);
                  } catch (error) {
                    setSignInError(
                      error instanceof Error ? error : new Error(String(error))
                    );
                  }
                } else {
                  try {
                    await signInWithRedirect(auth, provider);
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
}

export default function SigninOuter(props: Props): h.JSX.Element {
  return (
    <div class={style.signin}>
      <Signin {...props} />
    </div>
  );
}
