import { FunctionalComponent, h } from "preact";
import { Route, Router } from "preact-router";
import { useState, useEffect } from "preact/hooks";

import "../style/custom.scss";
import firebase from "firebase/app";

import Home from "../routes/home";
import Invited from "../routes/invited";
import Signin from "../routes/signin";
import Shopping from "../routes/shopping";
import ShoppingList from "../routes/list";
import NotFoundPage from "../routes/notfound";
import Settings from "../routes/settings";
import Header from "./header";
import Feedback from "../routes/feedback";
import About from "../routes/about";
import Version from "../routes/version";
import Counters from "../routes/counters";
import Share from "../routes/share";
import { OfflineWarning } from "./offline-warning";

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
if ((module as any).hot) {
  // tslint:disable-next-line:no-var-requires
  require("preact/debug");
}

import { List, FirestoreList, ListConfig } from "../types";
import { firebaseConfig } from "../firebaseconfig";

const app = firebase.initializeApp(firebaseConfig);

const App: FunctionalComponent = () => {
  const [auth, setAuth] = useState<firebase.auth.Auth | null>(null);
  const [user, setUser] = useState<firebase.User | null | false>(null);
  const [db, setDB] = useState<firebase.firestore.Firestore | null>(null);
  const [storage, setStorage] = useState<firebase.storage.Storage | null>(null);
  const [perf, setPerf] = useState<firebase.performance.Performance | null>(
    null
  );
  const [
    persistenceError,
    setPersistenceError,
  ] = useState<firebase.firestore.FirestoreError | null>(null);

  function authStateChanged(user: firebase.User | null) {
    setUser(user || false);
  }

  useEffect(() => {
    import("firebase/auth")
      .then(() => {
        const appAuth = app.auth();
        setAuth(appAuth);
        appAuth.onAuthStateChanged(authStateChanged);
      })
      .catch((error) => {
        console.error("Unable to lazy-load firebase/auth:", error);
      });

    import("firebase/firestore")
      .then(() => {
        const db = firebase.firestore();

        // Enable offline-ness
        // It's important that this is done *before* you use the `db`.
        db.enablePersistence({ synchronizeTabs: true }).catch((error) => {
          setPersistenceError(error);
        });

        setDB(db);

        // Clear any offline data.
        // firebase
        //   .firestore()
        //   .clearPersistence()
        //   .catch((error) => {
        //     console.error("Could not enable persistence:", error.code);
        //   });
      })
      .catch((error) => {
        console.error("Unable to lazy-load firebase/firestore:", error);
      });

    import("firebase/storage")
      .then(() => {
        setStorage(firebase.storage());
      })
      .catch((error) => {
        console.error("Unable to lazy-load firebase/storage:", error);
      });

    import("firebase/analytics")
      .then(() => {
        // Enable analytics
        firebase.analytics();
      })
      .catch((error) => {
        console.error("Unable to lazy-load firebase/analytics:", error);
      });

    import("firebase/performance")
      .then(() => {
        setPerf(firebase.performance());
      })
      .catch((error) => {
        console.error("Unable to lazy-load firebase/performance:", error);
      });
  }, []);

  const [lists, setLists] = useState<List[] | null>(null);

  const [snapshotsOffline, toggleSnapshotsOffline] = useState(false);

  useEffect(() => {
    let shoppinglistsDbRef: () => void;
    if (db && user) {
      // const trace = perf
      //   ? perf.trace("initial_shoppinglists_collection")
      //   : null;
      // let traceOnce = false;
      // trace && trace.start();

      // This is needed because it's added late. And instead of migrating
      // all/any lists, we rely on a fallback default.
      const defaultListConfig: ListConfig = {
        disableGroups: false,
        disableQuantity: false,
        disableDefaultSuggestions: false,
      };

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
            const config = data.config || Object.assign({}, defaultListConfig);

            // Because it used to be that `.disableGroups` used to be on the
            // list itself, we need to respect that and migrate that over.
            // Let's delete this in late 2020.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            if ((data as any).disableGroups && !data.config) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
              config.disableGroups = (data as any).disableGroups;
            }

            newLists.push({
              id: doc.id,
              name: data.name,
              notes: data.notes,
              order: data.order,
              added:
                data.added || firebase.firestore.Timestamp.fromDate(new Date()),
              owners: data.owners,
              ownersMetadata: data.ownersMetadata || {},
              metadata: doc.metadata,
              config,
              recent_items: data.recent_items || [],
              active_items_count: data.active_items_count || 0,
              modified:
                data.modified ||
                data.added ||
                // For legacy reasons, if it doesn't have a .added or
                // .modified make it something old.
                firebase.firestore.Timestamp.fromMillis(
                  // Just make it really really old if it doesn't have a
                  // .modified attribute.
                  new Date().getTime() - 1000 * 60 * 60 * 24 * 90
                ),
            });
          });

          if (!newLists.length) {
            const foodEmojis = ["🍌", "🥕", "🧃", "🥫", "🌽", "🍅", "🍉"];
            const randomFoodEmoji =
              foodEmojis[Math.floor(Math.random() * foodEmojis.length)];
            // Manually create their first ever list
            db.collection("shoppinglists")
              .add({
                name: `Groceries ${randomFoodEmoji}`,
                notes: "",
                owners: [user.uid],
                order: 0,
                recent_items: [],
                active_items_count: 0,
                config: Object.assign({}, defaultListConfig),
                added: firebase.firestore.Timestamp.fromDate(new Date()),
                modified: firebase.firestore.Timestamp.fromDate(new Date()),
              })
              .then(() => {
                console.log("Initial sample list created");
              })
              .catch((error) => {
                console.error("Error creating first sample list", error);
              });
          } else if (newLists.length > 1) {
            newLists.sort((a, b) => {
              return (
                b.modified.toDate().getTime() - a.modified.toDate().getTime()
              );
            });
          }
          setLists(newLists);

          // if (trace && !traceOnce) {
          //   trace.stop();
          //   traceOnce = true;
          // }
        });
    }
    return () => {
      if (shoppinglistsDbRef) {
        shoppinglistsDbRef();
      }
    };
  }, [db, user]);

  // function handleRoute(event: RouterOnChangeArgs) {}

  return (
    <div id="app" class="container">
      {snapshotsOffline && <OfflineWarning />}
      <Header auth={auth} user={user} />

      <DisplayPersistenceError error={persistenceError} />

      <div class="main">
        {/* <Router onChange={handleRoute}> */}
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
            storage={storage}
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

          <Route path="/about" component={About} />
          <Route path="/version" component={Version} />
          <Route path="/counters" component={Counters} db={db} />
          <Route path="/share" component={Share} />
          <NotFoundPage default />
        </Router>
        {/* {process.env.NODE_ENV === "development" && db && (
          <DebugOffline db={db} />
        )} */}
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
  let message = (
    <span>
      You might experience problems using the app without a connection.
    </span>
  );
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
    <div class="hide-in-print">
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
