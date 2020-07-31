import { FunctionalComponent, h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";
import { useState, useEffect } from "preact/hooks";

// import "bootstrap/scss/bootstrap";
import "../style/custom.scss";
// import * as firebase from "firebase/app";
import firebase from "firebase/app";

import "firebase/auth";
import "firebase/firestore";

import Loading from "./loading";
import Home from "../routes/home";
import Invited from "../routes/invited";
import Signin from "../routes/signin";
import Shopping from "../routes/shopping";
import ShoppingList from "../routes/list";
import NotFoundPage from "../routes/notfound";
import Header from "./header";

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
  const [user, setUser] = useState<firebase.User | null>(null);
  const [db, setDB] = useState<firebase.firestore.Firestore | null>(null);

  function authStateChanged(user: firebase.User | null) {
    setUser(user);
  }

  useEffect(() => {
    const appAuth = app.auth();
    setAuth(appAuth);
    appAuth.onAuthStateChanged(authStateChanged);

    setDB(app.firestore());
  }, []);

  const [lists, setLists] = useState<List[] | null>(null);

  useEffect(() => {
    let shoppinglistsDbRef: () => void;
    if (db && user) {
      shoppinglistsDbRef = db
        .collection("shoppinglists")
        .where("owners", "array-contains", user.uid)
        .orderBy("order")
        .onSnapshot((snapshot) => {
          const newLists: List[] = [];
          snapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            const data = doc.data() as FirestoreList;
            newLists.push({
              id: doc.id,
              name: data.name,
              notes: data.notes,
              order: data.order,
              owners: data.owners,
            });
          });

          // XXX What we could do is newLists.length ===0 is to forcibly
          // create a first default one.
          if (!newLists.length) {
            console.log("Consider creating one!");
          }

          setLists(newLists);
        });
    }
    return () => {
      if (shoppinglistsDbRef) {
        console.log("Detach shoppinglists db ref listener");
        shoppinglistsDbRef();
      }
    };
  }, [db, user]);

  return (
    <div id="app" class="container">
      <Header auth={auth} user={user} />
      {/* <Router onChange={handleRoute}> */}
      {db && auth ? (
        <Router>
          <Route
            path="/"
            component={Home}
            user={user}
            auth={auth}
            db={db}
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
            path="/invited/:id"
            component={Invited}
            lists={lists}
            user={user}
            db={db}
            auth={auth}
          />
          <Route path="/signin" component={Signin} user={user} auth={auth} />
          <NotFoundPage default />
        </Router>
      ) : (
        <Loading />
      )}
    </div>
  );
};

export default App;
