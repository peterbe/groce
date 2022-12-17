import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { route } from "preact-router";
import style from "./style.css";
import {
  Auth,
  User,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  // linkWithPopup,
  linkWithRedirect,
  linkWithPopup,
} from "firebase/auth";

import { Loading } from "../../components/loading";
import { GoBack } from "../../components/go-back";
import { Alert } from "../../components/alerts";

function Signin({ user, auth }: { user: User | false; auth: Auth }) {
  const [signInError, setSignInError] = useState<Error | null>(null);
  useEffect(() => {
    if (user && !user.isAnonymous) {
      document.title = "Sign out?";
    } else {
      document.title = "Sign in";
    }
  }, [user]);
  return (
    <div>
      <h2>{user && !user.isAnonymous ? "You are signed in" : "Sign in"}</h2>

      {signInError && <Alert heading="Sign in error" message={signInError} />}
      {user && !user.isAnonymous && (
        <p>
          Currently signed in as <b>{user.displayName}</b>
        </p>
      )}

      {user && !user.isAnonymous && (
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
      {(!user || user.isAnonymous) && (
        <div class="text-center my-5">
          <div class="my-5 d-grid gap-2">
            <button
              type="button"
              class="btn btn-primary btn-lg"
              onClick={async () => {
                const provider = new GoogleAuthProvider();
                if (user && user.isAnonymous) {
                  try {
                    await linkWithRedirect(user, provider);
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
              Sign in with Google (redirect)
            </button>{" "}
            <button
              type="button"
              class="btn btn-primary btn-lg"
              onClick={async () => {
                const provider = new GoogleAuthProvider();
                if (user && user.isAnonymous) {
                  try {
                    await linkWithPopup(user, provider);
                    route("/", true);
                  } catch (error) {
                    setSignInError(
                      error instanceof Error ? error : new Error(String(error))
                    );
                  }
                } else {
                  try {
                    await signInWithPopup(auth, provider);
                    route("/", true);
                  } catch (error) {
                    setSignInError(
                      error instanceof Error ? error : new Error(String(error))
                    );
                  }
                }
              }}
            >
              Sign in with Google (popup)
            </button>
          </div>
          <p>
            Which one you use might depend on your device. Try the other if one
            of them doesn't work.
          </p>
        </div>
      )}
      {user && user.isAnonymous && (
        <p style={{ marginTop: 50 }}>
          <button
            type="button"
            class="btn btn-warning btn-sm"
            onClick={async () => {
              try {
                await auth.signOut();
              } catch (error) {
                console.error("Unable to sign out", error);
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

export default function SigninOuter({
  user,
  auth,
}: {
  user: User | false | null;
  auth: Auth | null;
}): h.JSX.Element {
  return (
    <div class={style.signin}>
      {auth && user !== null ? <Signin user={user} auth={auth} /> : <Loading />}
    </div>
  );
}
