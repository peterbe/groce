import { FunctionalComponent, h } from "preact";
import { Link, route } from "preact-router";
import { useEffect, useState } from "preact/hooks";
import firebase from "firebase/app";

import * as style from "./style.css";
import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { List, Invite, FirestoreInvite } from "../../types";

interface Props {
  db: firebase.firestore.Firestore | null;
  user: firebase.User | false | null;
  lists: List[] | null;
  id: string;
}

const Invited: FunctionalComponent<Props> = (props: Props) => {
  const { id, user, db, lists } = props;

  useEffect(() => {
    try {
      sessionStorage.setItem("invitedID", id);
    } catch (error) {
      console.error("Unable to set sessionStorage item", error);
    }
  }, [id]);

  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteError, setInviteError] = useState<Error | null>(null);

  useEffect(() => {
    if (user && lists && db) {
      db.collection("invites")
        .doc(id)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const data = doc.data() as FirestoreInvite;
            setInvite(
              Object.assign(
                {
                  id: doc.id,
                },
                data
              )
            );
            if (data.inviter_uid === user.uid) {
              if (sessionStorage.getItem("invitedID")) {
                try {
                  // get rid of it
                  sessionStorage.removeItem("invitedID");
                } catch (error) {
                  console.warn(
                    "Unable to get rid of sessionStorage item",
                    error
                  );
                }
              }
            }
          } else {
            setInviteError(new Error("Invite does not exist"));
          }
        })
        .catch((error) => {
          console.error("Invite doc error:", error);
          setInviteError(error);
        });
    }
  }, [id, user, lists]);

  // console.log({
  //   db: !!db,
  //   auth: !!auth,
  //   user: !!user,
  //   lists: !!lists,
  //   invite: !!invite,
  //   inviteError: !!inviteError,
  // });

  function acceptInvite() {
    if (db && invite) {
      console.warn("Need a cloud function here!");
      // const docRef = db.collection('shoppinglists').doc(invite.list)
      // docRef.get().then(doc => {
      //   if (doc.exists) {
      //     const data = doc.data() as FirestoreList
      //     const previousOwners = data.owners
      //     console.log(previousOwners);

      //   } else {
      //     throw new Error("List doesn't exist!")
      //   }
      // })
    } else {
      throw new Error("Can't accept invite yet");
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
  } else if (inviteError) {
    inner = <Alert heading="Invite error" message={inviteError.toString()} />;
  } else if (invite) {
    if (user && invite.inviter_uid === user.uid) {
      inner = (
        <Alert
          heading="This is your own invite"
          message="You're viewing an invite you yourself created."
          type="warning"
        />
      );
    } else if (invite.expires.toDate() < new Date()) {
      inner = (
        <Alert
          heading="Invite has expired"
          message={`Ask ${invite.about.inviter} to create a new invite maybe?`}
          type="warning"
        />
      );
    } else {
      inner = (
        <div>
          <p>
            You&apos;ve been invited by <b>{invite.about.inviter}</b> to
            shopping list <b>{invite.about.name}</b>{" "}
            {invite.about.notes && <small>({invite.about.notes})</small>}
          </p>
          <button
            type="button"
            class="btn btn-primary btn-lg btn-block"
            onClick={() => {
              acceptInvite();
            }}
          >
            Accept
          </button>
          <Link href="/" class="btn btn-info btn-block">
            Cancel/ignore
          </Link>
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
