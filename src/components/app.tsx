import { FunctionalComponent, h } from "preact";
import { Route, Router } from "preact-router";
import { useState, useEffect } from "preact/hooks";

import "../style/custom.scss";
// import * as firebase from "firebase/app";
import firebase from "firebase/app";

import "firebase/auth";
import "firebase/firestore";

import Home from "../routes/home";
import Invited from "../routes/invited";
import Signin from "../routes/signin";
import Shopping from "../routes/shopping";
import ShoppingList from "../routes/list";
import NotFoundPage from "../routes/notfound";
import Settings from "../routes/settings";
import Header from "./header";
import Feedback from "../routes/feedback";
import { OfflineWarning } from "./offline-warning";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
if ((module as any).hot) {
  // tslint:disable-next-line:no-var-requires
  require("preact/debug");
}

import { List, FirestoreList } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyBlMzrsBR_KWXDdgntBgnCThjRqr-0I8js",
  authDomain: "groce-dev.firebaseapp.com",
  databaseURL: "https://groce-dev.firebaseio.com",
  projectId: "groce-dev",
  storageBucket: "groce-dev.appspot.com",
  messagingSenderId: "170241343352",
  appId: "1:170241343352:web:5282dd555337af2a62d28d",
};

const app = firebase.initializeApp(firebaseConfig);

const App: FunctionalComponent = () => {
  // let currentUrl: string;
  // const handleRoute = (e: RouterOnChangeArgs) => {
  //   currentUrl = e.url;
  // };

  const [auth, setAuth] = useState<firebase.auth.Auth | null>(null);
  const [user, setUser] = useState<firebase.User | null | false>(null);
  const [db, setDB] = useState<firebase.firestore.Firestore | null>(null);
  const [
    persistenceError,
    setPersistenceError,
  ] = useState<firebase.firestore.FirestoreError | null>(null);

  function authStateChanged(user: firebase.User | null) {
    setUser(user || false);
  }

  useEffect(() => {
    const appAuth = app.auth();
    setAuth(appAuth);
    appAuth.onAuthStateChanged(authStateChanged);

    const db = firebase.firestore();
    setDB(db);

    // Clear any offline data.
    // firebase
    //   .firestore()
    //   .clearPersistence()
    //   .catch((error) => {
    //     console.error("Could not enable persistence:", error.code);
    //   });

    // Enable offline-ness
    db.enablePersistence().catch((error) => {
      setPersistenceError(error);
    });
  }, []);

  const [lists, setLists] = useState<List[] | null>(null);

  const [snapshotsOffline, toggleSnapshotsOffline] = useState(false);

  useEffect(() => {
    let shoppinglistsDbRef: () => void;
    if (db && user) {
      shoppinglistsDbRef = db
        .collection("shoppinglists")
        .where("owners", "array-contains", user.uid)
        .orderBy("order")
        .onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
          if (
            snapshot.metadata.fromCache &&
            snapshot.metadata.hasPendingWrites
          ) {
            toggleSnapshotsOffline(true);
          } else {
            toggleSnapshotsOffline(false);
          }
          const newLists: List[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreList;
            newLists.push({
              id: doc.id,
              name: data.name,
              notes: data.notes,
              order: data.order,
              owners: data.owners,
              metadata: doc.metadata,
              recent_items: data.recent_items || [],
              active_items_count: data.active_items_count || 0,
            });
          });

          if (!newLists.length) {
            // Manually create their first ever list
            db.collection("shoppinglists")
              .add({
                name: "Groceries 🌽",
                notes: "",
                owners: [user.uid],
                order: 0,
                recent_items: [],
                active_items_count: 0,
              })
              .then(() => {
                console.log("Added first default shopping list");
              })
              .catch((error) => {
                console.error("Error creating first sample list", error);
              });
          }

          setLists(newLists);
        });
    }
    return () => {
      if (shoppinglistsDbRef) {
        shoppinglistsDbRef();
      }
    };
  }, [db, user]);

  return (
    <div id="app" class="container">
      {snapshotsOffline && <OfflineWarning />}
      <Header auth={auth} user={user} />

      <DisplayPersistenceError error={persistenceError} />
      {/* <Router onChange={handleRoute}> */}

      <div class="main">
        <Router>
          <Route
            path="/"
            component={Home}
            db={db}
            user={user}
            auth={auth}
            lists={lists}
          />
          <Route
            path="/shopping"
            component={Shopping}
            user={user}
            db={db}
            lists={lists}
          />
          <Route
            path="/shopping/:id"
            component={ShoppingList}
            lists={lists}
            user={user}
            db={db}
          />
          <Route
            path="/invited/:listID/:invitationID"
            component={Invited}
            lists={lists}
            user={user}
            db={db}
          />
          <Route path="/signin" component={Signin} user={user} auth={auth} />
          <Route path="/settings" component={Settings} />
          <Route
            path="/feedback"
            component={Feedback}
            lists={lists}
            user={user}
            db={db}
          />
          <NotFoundPage default />
        </Router>
        {process.env.NODE_ENV === "development" && db && (
          <DebugOffline db={db} />
        )}
      </div>
    </div>
  );
};

export default App;

function DisplayPersistenceError({
  error,
}: {
  error: firebase.firestore.FirestoreError | null;
}) {
  if (error === null) return null;
  let message = <span>Struggling to be offline.</span>;
  if (error.code == "failed-precondition") {
    message = (
      <span>
        Multiple tabs open, persistence can only be enabled in one tab at a a
        time.
      </span>
    );
  } else if (error.code === "unimplemented") {
    message = (
      <span>
        The current browser does not support all of the features required to
        enable persistence.
      </span>
    );
  }
  return (
    <div class="alert alert-warning" role="alert">
      <b>Offline problem</b> {message}
    </div>
  );
}

function DebugOffline({ db }: { db: firebase.firestore.Firestore }) {
  const [enableOffline, toggleEnableOffline] = useState(false);
  const [enablingError, setEnablingError] = useState<Error | null>(null);
  useEffect(() => {
    if (enableOffline) {
      db.disableNetwork()
        .then(() => {
          setEnablingError(null);
        })
        .catch((error) => {
          console.error("Unable to disable network", error);
          setEnablingError(error);
        });
    } else {
      db.enableNetwork()
        .then(() => {
          setEnablingError(null);
        })
        .catch((error) => {
          console.error("Unable to enable network", error);
          setEnablingError(error);
        });
    }
  }, [db, enableOffline]);
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  return (
    <div>
      <div class="form-check form-switch" style={{ marginTop: 100 }}>
        <input
          class="form-check-input"
          type="checkbox"
          id="flexSwitchCheckDefault"
          checked={enableOffline}
          onChange={() => {
            toggleEnableOffline((before) => !before);
          }}
        />
        <label class="form-check-label" htmlFor="flexSwitchCheckDefault">
          Go offline <small>(useful for development and testing)</small>
        </label>
      </div>
      {enablingError && (
        <div class="alert alert-danger" role="alert">
          {enablingError.toString()}
        </div>
      )}
    </div>
  );
}
