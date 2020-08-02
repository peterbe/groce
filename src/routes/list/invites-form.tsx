import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import copy from "copy-to-clipboard";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { FirestoreInvite, Invite, List } from "../../types";

interface Props {
  list: List;
  db: firebase.firestore.Firestore;
  user: firebase.User;
}

export const InvitesForm: FunctionalComponent<Props> = ({
  list,
  db,
  user,
}: Props) => {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [invitesError, setInvitesError] = useState<Error | null>(null);

  // const [showShare, setShowShare] = useState(!!navigator.share || true);
  const showShare = !!navigator.share;
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (copied) {
      setTimeout(() => {
        if (mounted) {
          setCopied(false);
        }
      }, 3 * 1000);
    }
    return () => {
      mounted = false;
    };
  }, [copied]);

  useEffect(() => {
    let mounted = true;
    if (shared) {
      setTimeout(() => {
        if (mounted) {
          setShared(false);
        }
      }, 10 * 1000);
    }
    return () => {
      mounted = false;
    };
  }, [shared]);

  useEffect(() => {
    const ref = db
      .collection("invites")
      .where("inviter_uid", "==", user.uid)
      .where("list", "==", list.id)
      .onSnapshot(
        (snapshot) => {
          const newInvites: Invite[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreInvite;
            // If it has expired, delete it immediately
            if (data.expires.toDate() < new Date()) {
              // Expired!
              deleteInvite(doc.id);
            } else {
              newInvites.push({
                id: doc.id,
                list: data.list,
                email: data.email,
                added: data.added,
                expires: data.expires,
                about: data.about,
                inviter_uid: data.inviter_uid,
              });
            }
          });
          setInvites(newInvites);
        },
        (error) => {
          console.log("Error on snapshot", error);
          setInvitesError(error);
        }
      );
    return () => {
      if (ref) {
        ref();
      }
    };
  }, [db, list]);

  const [deleteError, setDeleteError] = useState<Error | null>(null);

  function deleteInvite(inviteID: string) {
    db.collection("invites")
      .doc(inviteID)
      .delete()
      .then(() => {
        console.log("Document successfully deleted!");
      })
      .catch((error) => {
        console.error("Error removing document: ", error);
        setDeleteError(error);
      });
  }

  async function generateInviteLink() {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 30);
    await db.collection("invites").add({
      inviter_uid: user.uid,
      inviter_name: user.displayName,
      added: firebase.firestore.Timestamp.fromDate(now),
      expires: firebase.firestore.Timestamp.fromDate(future),
      list: list.id,
      about: {
        name: list.name,
        notes: list.notes,
        inviter: user.displayName,
      },
    });
  }
  if (deleteError) {
    return (
      <Alert
        heading="Invite couldn't be deleted"
        message={deleteError.toString()}
      />
    );
  }

  return (
    <form>
      <div class="mb-3">
        {invites && !invites.length && (
          <p>
            <button
              type="button"
              class="btn btn-info"
              onClick={async () => {
                await generateInviteLink();
              }}
            >
              Generate new invite
            </button>
          </p>
        )}

        {invites && invites.length ? (
          <div>
            {invites.map((invite) => {
              const inviteURL = `/invited/${invite.id}`;
              const loc = window.location;
              const absoluteInviteURL = `${loc.protocol}//${loc.host}${inviteURL}`;

              return (
                <div class="card" key={invite.id}>
                  <div class="card-header">Invite</div>
                  <div class="card-body">
                    <h5 class="card-title">
                      <a href={inviteURL}>
                        <code>{absoluteInviteURL}</code>
                      </a>
                    </h5>
                    <p class="card-text">
                      Expires: {invite.expires.toDate().toLocaleDateString()}
                    </p>
                    {shareError && (
                      <p style={{ color: "red" }}>
                        <b>Share error:</b> <code>{shareError.toString()}</code>
                      </p>
                    )}
                    {showShare && (
                      <button
                        type="button"
                        class="btn btn-info"
                        onClick={() => {
                          const shareData = {
                            title: list.name,
                            text: user?.displayName
                              ? `Shopping list (${list.name}) shared by ${user.displayName}`
                              : `Shopping list (${list.name})`,
                            url: absoluteInviteURL,
                          };
                          setShareError(null);
                          try {
                            navigator
                              .share(shareData)
                              .then(() => {
                                setShared(true);
                                setShareError(null);
                              })
                              .catch((e) => {
                                setShareError(e);
                              });
                          } catch (error) {
                            console.error(
                              "Error trying to navigator.share",
                              error
                            );
                            setShareError(error);
                          }
                        }}
                      >
                        Web Share (recommended)
                      </button>
                    )}{" "}
                    <button
                      type="button"
                      class="btn btn-info"
                      onClick={() => {
                        copy(absoluteInviteURL);
                        setCopied(true);
                      }}
                    >
                      {copied ? "Copied to clipboard" : "Copy link"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {invites && !invites.length && (
          <p>
            <i>You have no current invites to this list</i>
          </p>
        )}

        {invitesError && (
          <Alert
            heading="Error getting list of invites"
            message={invitesError.toString()}
          />
        )}
      </div>
    </form>
  );
};
