import { FunctionalComponent, h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";
import { useState, useEffect } from "preact/hooks";

// import "bootstrap/scss/bootstrap";
import "../style/custom.scss";
// import * as firebase from "firebase/app";
import firebase from "firebase/app";

import "firebase/auth";
import "firebase/firestore";

import Home from "../routes/home";
// import Profile from "../routes/profile";
import Signin from "../routes/signin";
import Shopping from "../routes/shopping";
import List from "../routes/list";
import NotFoundPage from "../routes/notfound";
import Header from "./header";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
if ((module as any).hot) {
  // tslint:disable-next-line:no-var-requires
  require("preact/debug");
}

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
    // console.log("AUTH STATE CHANGED FOR USER:", user);
    setUser(user);
  }

  useEffect(() => {
    const appAuth = app.auth();
    setAuth(appAuth);
    appAuth.onAuthStateChanged(authStateChanged);

    setDB(app.firestore());
    // appAuth.onAuthStateChanged(user => {
    //   console.log("AUTH STATE CHANGED FOR USER:", user);
    // });

    // authRef.current = app.auth();
    // authRef.current.onAuthStateChanged(authStateChanged);
    // const database = app.firestore();
    // console.log(authRef.current);
  }, []);

  return (
    <div id="app">
      <Header auth={auth} user={user} />
      {/* <Router onChange={handleRoute}> */}
      <Router>
        <Route path="/" component={Home} user={user} auth={auth} db={db} />
        <Route path="/shopping" component={Shopping} user={user} db={db} />
        <Route path="/shopping/:id" component={List} user={user} db={db} />
        <Route path="/signin" component={Signin} user={user} auth={auth} />
        {/* <Route path="/profile/" component={Profile} user="me" />
        <Route path="/profile/:user" component={Profile} /> */}
        <NotFoundPage default />
      </Router>
    </div>
  );
};

export default App;
