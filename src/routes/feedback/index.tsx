import { h } from "preact";
import { Link } from "preact-router";
import style from "./style.css";

import { useEffect, useState } from "preact/hooks";
import { User } from "firebase/auth";
import {
  Firestore,
  onSnapshot,
  Unsubscribe,
  FirestoreError,
  collection,
  addDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { Loading } from "../../components/loading";
import { List } from "../../types";

interface FirestoreSubmission {
  subject: string;
  topic: string;
  text: string;
  list: {
    id: string;
    name: string;
  } | null;
  user: {
    email: string | null;
    displayName: string | null;
  };
  added: Timestamp;
}
interface Submission extends FirestoreSubmission {
  id: string;
}

const PRESET_TOPICS = [
  "Something's not working",
  "Feature suggestion",
  "General praise",
  "Constructive criticism",
];

function Feedback({
  user,
  lists,
  db,
}: {
  user: User | false;
  db: Firestore;
  lists: List[] | null;
}) {
  useEffect(() => {
    document.title = "Feedback";
  }, []);

  if (!user) {
    return (
      <Alert
        type="warning"
        heading="You have to be signed in to post feedback"
        message="Please use the menu to sign in. If that doesn't work consider sending an email to mail@peterbe.com"
      />
    );
  }
  if (user.isAnonymous) {
    return (
      <div>
        <div class="alert alert-warning" role="alert">
          <b>You&apos;re not actually signed in.</b> Yet. <br />
          Sorry, can&apos;t submit feedback anonymously.
        </div>
        <p>
          <Link href="/signin" class="btn btn-primary">
            Sign in properly &rarr;
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <Submissions user={user} db={db} />
      <Form user={user} lists={lists} db={db} />
    </div>
  );
}

export default function FeedbackOuter({
  user,
  lists,
  db,
}: {
  user: User | false | null;
  db: Firestore | null;
  lists: List[] | null;
}): h.JSX.Element {
  return (
    <div class={style.feedback}>
      <h1>Feedback</h1>
      <p class="lead">
        Thank you for using this app. With your help, it can get better. Not
        just for you but for everybody. Please share you feedback.
      </p>
      {db && user !== null ? (
        <Feedback user={user} db={db} lists={lists} />
      ) : (
        <Loading />
      )}

      <GoBack />

      <p style={{ marginTop: 50 }}>
        If you prefer you can send any feedback to <code>mail@peterbe.com</code>
        .
      </p>
    </div>
  );
}

function Form({
  lists,
  db,
  user,
}: {
  lists: List[] | null;
  db: Firestore;
  user: User;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");

  const [list, setList] = useState<List | null>(null);

  function submitFeedback() {
    const collectionRef = collection(db, "feedback");
    addDoc(collectionRef, {
      creator_uid: user.uid,
      user: {
        email: user.email,
        displayName: user.displayName,
      },
      subject,
      topic,
      text,
      list: list
        ? {
            id: list.id,
            name: list.name,
          }
        : null,
      added: Timestamp.fromDate(new Date()),
    })
      .then(() => {
        setSubmitted(true);
        setSubject("");
        setTopic("");
        setText("");
        setList(null);
      })
      .catch((error) => {
        console.error("Error submitting feedback", error);
        setSubmitError(error);
      });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (subject.trim()) {
          submitFeedback();
        }
      }}
    >
      {submitError && (
        <Alert
          heading="Submission error"
          message={submitError}
          offerReload={true}
        />
      )}
      {submitted && (
        <Alert
          heading="Feedback submitted"
          type="success"
          message={"Thanks for taking the time."}
        />
      )}
      <div class="mb-3">
        <label htmlFor="id_subject" class="form-label">
          Subject
        </label>
        <input
          type="text"
          class="form-control"
          id="id_subject"
          value={subject}
          onInput={(event) => {
            setSubject(event.currentTarget.value);
          }}
        />
      </div>

      <div class="mb-3">
        <label htmlFor="id_topic" class="form-label">
          Topic
        </label>
        <input
          class="form-control"
          list="topicOptions"
          id="id_topic"
          placeholder="(optional)"
          aria-describedby="topicHelp"
          value={topic}
          onInput={(event) => {
            setTopic(event.currentTarget.value);
          }}
        />
        <datalist id="topicOptions">
          {PRESET_TOPICS.map((topic) => (
            <option key={topic} value={topic} />
          ))}
        </datalist>
        <div id="topicHelp" class="form-text">
          Pick from the list or type your own.
        </div>
      </div>

      <div class="mb-3">
        <label htmlFor="id_text" class="form-label">
          Text
        </label>
        <textarea
          class="form-control"
          id="id_text"
          rows={Math.max(4, text.trim().split("\n").length)}
          value={text}
          onInput={(event) => {
            setText(event.currentTarget.value);
          }}
        />
      </div>

      {lists && lists.length && (
        <div class="mb-3">
          <label htmlFor="id_list" class="form-label">
            Specific shopping list
          </label>
          <select
            class="form-select"
            id="id_list"
            aria-label="Specific shopping list"
            value={list ? list.id : ""}
            onChange={(event) => {
              const listID = event.currentTarget.value;
              if (lists) {
                setList(lists.find((list) => list.id === listID) || null);
              }
            }}
          >
            <option selected>(optional)</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" class="btn btn-primary" disabled={!subject.trim()}>
        Submit feedback
      </button>
    </form>
  );
}

function Submissions({ db, user }: { db: Firestore; user: User }) {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [submissionsError, setSubmissionsError] =
    useState<FirestoreError | null>(null);

  useEffect(() => {
    let unsubscribe: null | Unsubscribe = null;
    if (user) {
      const collectionRef = collection(db, "feedback");
      const q = query(collectionRef, where("creator_uid", "==", user.uid));
      const newSubmissions: Submission[] = [];
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreSubmission;
            newSubmissions.push({
              id: doc.id,
              subject: data.subject,
              topic: data.topic,
              text: data.text,
              user: data.user,
              added: data.added,
              list: data.list,
            });
          });
          setSubmissions(newSubmissions);
        },
        (error) => {
          console.error("Error getting submission snapshot", error);
          setSubmissionsError(error);
        }
      );
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [db, user]);

  if (!submissions || !submissions.length) {
    return null;
  }

  return (
    <div class={style.submissions}>
      <h3>Your feedback submissions</h3>
      {submissionsError && (
        <Alert
          heading="Error getting your submissions"
          message={submissionsError}
          offerReload={true}
        />
      )}
      {submissions.map((submission) => {
        return (
          <div key={submission.id} class="card" style={{ marginBottom: 20 }}>
            <div class="card-body">
              <h5 class="card-title">{submission.subject}</h5>
              <h6 class="card-subtitle mb-2 text-muted">{submission.topic}</h6>
              <p class="card-text">{submission.text}</p>
              {submission.list && (
                <Link
                  href={`/shopping/${submission.list.id}`}
                  class="card-link"
                >
                  {submission.list.name}
                </Link>
              )}
              <br />
              <small>
                Submitted {submission.added.toDate().toLocaleDateString()}
              </small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
