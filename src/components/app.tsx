import { FunctionalComponent, h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";
// import * as firebase from "firebase/app";
import firebase from "firebase/app";

import "firebase/auth";
import "firebase/firestore";

import Home from "../routes/home";
import Profile from "../routes/profile";
import NotFoundPage from "../routes/notfound";
import Header from "./header";
import { useState, useEffect } from "preact/hooks";

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

  // const authRef = useRef(null);
  const [auth, setAuth] = useState<firebase.auth.Auth | null>(null);

  const [user, setUser] = useState<firebase.User | null>(null);

  function authStateChanged(user: firebase.User | null) {
    // console.log("AUTH STATE CHANGED FOR USER:", user);
    setUser(user);
  }

  useEffect(() => {
    const appAuth = app.auth();
    setAuth(appAuth);
    appAuth.onAuthStateChanged(authStateChanged);
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
      <Header />
      {/* <Router onChange={handleRoute}> */}
      <Router>
        <Route path="/" component={Home} user={user} auth={auth} />
        <Route path="/profile/" component={Profile} user="me" />
        <Route path="/profile/:user" component={Profile} />
        <NotFoundPage default />
      </Router>
    </div>
  );
};

export default App;
