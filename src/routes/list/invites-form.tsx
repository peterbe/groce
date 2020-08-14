import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import copy from "copy-to-clipboard";
import firebase from "firebase/app";

import { Alert } from "../../components/alerts";
import { FirestoreInvitation, Invitation, List } from "../../types";

interface Props {
  list: List;
  db: firebase.firestore.Firestore;
  user: firebase.User;
}

export const InvitationsForm: FunctionalComponent<Props> = ({
  list,
  db,
  user,
}: Props) => {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [invitationsError, setInvitationsError] = useState<Error | null>(null);

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
      .collection(`shoppinglists/${list.id}/invitations`)
      .onSnapshot(
        (snapshot) => {
          const newInvitations: Invitation[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreInvitation;
            newInvitations.push({
              id: doc.id,
              email: data.email,
              added: data.added,
              expires: data.expires,
              inviter_uid: data.inviter_uid,
              about: {
                inviter: data.about.inviter,
                name: data.about.name,
                notes: data.about.notes,
                inviter_name: data.about.inviter_name,
              },
              accepted: [],
            });
          });
          setInvitations(newInvitations);
        },
        (error) => {
          console.log("Error getting invitations list", error);
        }
      );

    return () => {
      if (ref) {
        ref();
      }
    };
  }, [db, list]);

  const [deleteError, setDeleteError] = useState<Error | null>(null);

  function deleteInvite(invitationID: string) {
    db.collection(`shoppinglists/${list.id}/invitations`)
      .doc(invitationID)
      .delete()
      .then(() => {
        console.log("Invited deleted");
      })
      .catch((error) => {
        console.error("Unable to delete invite", error);
        setDeleteError(error);
      });
  }

  function generateInviteLink() {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 30);
    db.collection(`shoppinglists/${list.id}/invitations`)
      .add({
        inviter_uid: user.uid,
        added: firebase.firestore.Timestamp.fromDate(now),
        expires: firebase.firestore.Timestamp.fromDate(future),
        about: {
          name: list.name,
          notes: list.notes,
          inviter: user.uid,
          inviter_name: user.displayName,
        },
      })
      .then(() => {
        console.log("Invitation created");
      })
      .catch((error) => {
        console.error("Error adding invitation", error);
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
        {invitations && !invitations.length && (
          <p>
            <button
              type="button"
              class="btn btn-info"
              onClick={() => {
                generateInviteLink();
              }}
            >
              Generate new invite
            </button>
          </p>
        )}

        {invitations && invitations.length ? (
          <div>
            {invitations.map((invitation) => {
              const inviteURL = `/invited/${list.id}/${invitation.id}`;
              const loc = window.location;
              const absoluteInviteURL = `${loc.protocol}//${loc.host}${inviteURL}`;

              return (
                <div class="card" key={invitation.id}>
                  <div class="card-header">Invite</div>
                  <div class="card-body">
                    <h5 class="card-title">
                      <a href={inviteURL}>
                        <code>{absoluteInviteURL}</code>
                      </a>
                    </h5>
                    <p class="card-text">
                      Expires:{" "}
                      {invitation.expires.toDate().toLocaleDateString()}
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
                    </button>{" "}
                    <DeleteInviteOption
                      confirmed={() => {
                        deleteInvite(invitation.id);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {invitations && !invitations.length && (
          <p>
            <i>You have no current invites to this list</i>
          </p>
        )}

        {invitationsError && (
          <Alert
            heading="Error getting list of invites"
            message={invitationsError.toString()}
          />
        )}
      </div>
    </form>
  );
};

function DeleteInviteOption({ confirmed }: { confirmed: () => void }) {
  const [certain, toggleCertain] = useState(false);
  if (certain) {
    return (
      <span>
        {" "}
        <b>Certain?</b>{" "}
        <button
          type="button"
          class="btn btn-info btn-sm"
          onClick={() => {
            toggleCertain(false);
          }}
        >
          Cancel
        </button>{" "}
        <button
          type="button"
          class="btn btn-danger btn-sm"
          onClick={() => {
            confirmed();
          }}
        >
          Yes
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      class="btn btn-warning btn-sm"
      onClick={() => {
        toggleCertain(true);
      }}
    >
      Delete
    </button>
  );
}
