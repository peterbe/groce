import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import copy from "copy-to-clipboard";
import { User } from "firebase/auth";
import {
  doc,
  Firestore,
  onSnapshot,
  collection,
  addDoc,
  query,
  Timestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { Alert } from "../../components/alerts";
import { FirestoreInvitation, Invitation, List } from "../../types";

export function InvitationsForm({
  list,
  db,
  user,
}: {
  list: List;
  db: Firestore;
  user: User;
}): h.JSX.Element {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);

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
    const collectionRef = collection(
      db,
      `shoppinglists/${list.id}/invitations`,
    );
    const unsubscribe = onSnapshot(
      query(collectionRef),
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
              id: data.about.id,
              name: data.about.name,
              notes: data.about.notes,
              inviter_name: data.about.inviter_name,
            },
            accepted: data.accepted,
          });
        });
        setInvitations(newInvitations);
      },
      (error) => {
        console.log("Error getting invitations list", error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [db, list]);

  const [deleteError, setDeleteError] = useState<Error | null>(null);

  async function deleteInvite(invitationID: string) {
    try {
      await deleteDoc(
        doc(db, `shoppinglists/${list.id}/invitations`, invitationID),
      );
    } catch (error) {
      setDeleteError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function generateInviteLink() {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 30);
    const collectionRef = collection(
      db,
      `shoppinglists/${list.id}/invitations`,
    );
    await addDoc(collectionRef, {
      inviter_uid: user.uid,
      added: Timestamp.fromDate(now),
      expires: Timestamp.fromDate(future),
      about: {
        id: list.id,
        name: list.name,
        notes: list.notes,
        inviter: user.uid,
        inviter_name: user.displayName,
      },
      accepted: [],
      accepted_names: [],
    });
    // .then(() => {
    //   console.log("Invitation created");
    // })
    // .catch((error) => {
    //   console.error("Error adding invitation", error);
    // });
  }

  async function setInvitationEmail(invitation: Invitation, email: string) {
    email = email.trim();
    await updateDoc(
      doc(db, `shoppinglists/${list.id}/invitations`, invitation.id),
      {
        email: email.toLowerCase(),
      },
    );

    // .then(() => {
    //   console.log(`Email '${email}' set on invitation`);
    // })
    // .catch((error) => {
    //   console.error("Error trying to set invitation email", error);
    // });
  }

  if (deleteError) {
    return (
      <Alert
        heading="Invite couldn't be deleted"
        message={deleteError}
        offerReload={true}
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
              disabled={user.isAnonymous}
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
                  {/* <div class="card-header">Invite</div> */}
                  <div class="card-body">
                    <h5 class="card-title">
                      <a href={inviteURL} style={{ fontSize: "70%" }}>
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
                              error,
                            );
                            setShareError(
                              error instanceof Error
                                ? error
                                : new Error(String(error)),
                            );
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
                      confirmed={async () => {
                        await deleteInvite(invitation.id);
                      }}
                    />
                    <SetInvitationEmail
                      invitation={invitation}
                      update={async (email: string) => {
                        await setInvitationEmail(invitation, email);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {invitations && !invitations.length && !user.isAnonymous && (
          <p>
            <i>You have no current invites to this list</i>
          </p>
        )}
        {invitations && !invitations.length && user.isAnonymous && (
          <p>You must signed in to generate an invite.</p>
        )}
      </div>
    </form>
  );
}

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

function SetInvitationEmail({
  invitation,
  update,
}: {
  invitation: Invitation;
  update: (email: string) => void;
}) {
  const [email, setEmail] = useState(invitation.email || "");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (submitted) {
      setTimeout(() => {
        if (mounted) {
          setSubmitted(false);
        }
      }, 3000);
    }
    return () => {
      mounted = false;
    };
  }, [submitted]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (email !== invitation.email) {
          update(email);
          setSubmitted(true);
        }
      }}
    >
      <label htmlFor="exampleInputEmail1" class="form-label">
        Email address
      </label>
      <input
        type="email"
        class="form-control"
        id="exampleInputEmail1"
        aria-describedby="emailHelp"
        value={email}
        onInput={({
          currentTarget,
        }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
          setEmail(currentTarget.value);
        }}
      />
      <div id="emailHelp" class="form-text">
        This <b>won&apos;t send</b> an email. It just means they&apos;ll{" "}
        <b>see this when they sign in</b> without needing the link.
      </div>
      <button type="submit" class="btn btn-primary">
        Save invitation email
      </button>

      {submitted && (
        <div
          class="alert alert-success alert-dismissible fade show"
          role="alert"
        >
          Email set
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="alert"
            aria-label="Close"
            onClick={() => {
              setSubmitted(false);
            }}
          />
        </div>
      )}
    </form>
  );
}
