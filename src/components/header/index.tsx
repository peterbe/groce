import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Link, route } from "preact-router";
import firebase from "firebase/app";

interface Props {
  user: firebase.User | false | null;
  auth: firebase.auth.Auth | null;
}

const Header: FunctionalComponent<Props> = (props: Props) => {
  const { user, auth } = props;

  // const [showUserMenu, setShowUserMenu] = useState(false);
  // const [showSigninMenu, setShowSigninMenu] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);
  const [showPrintThisPage, setShowPrintThisPage] = useState(false);

  useEffect(() => {
    // Other insert it into the menu if you're on a mobile device.
    if (typeof window.orientation !== "undefined") {
      setShowPrintThisPage(true);
    }
  }, []);

  return (
    <nav
      class="navbar fixed-bottom navbar-light bg-light"
      style={{ backgroundColor: "#e3f2fd" }}
    >
      <div class="container-md">
        <Link class="navbar-brand" href="/">
          <img
            src={"/assets/icons/favicon-32x32.png"}
            width="30"
            height="30"
            class="d-inline-block align-top"
            alt="Avocado logo"
            loading="lazy"
          />{" "}
          That&apos;s Groce!
        </Link>
        <button
          class={showNavbar ? "navbar-toggler" : "navbar-toggler collapsed"}
          type="button"
          data-toggle="collapse"
          data-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded={JSON.stringify(showNavbar)}
          aria-label="Toggle navigation"
          onClick={() => {
            setShowNavbar(!showNavbar);
          }}
        >
          <span class="navbar-toggler-icon" />
        </button>
        <div
          class={
            showNavbar
              ? "collapse navbar-collapse show"
              : "collapse navbar-collapse"
          }
          id="navbarSupportedContent"
        >
          <ul class="navbar-nav mr-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <Link
                class="nav-link"
                activeClassName={"active"}
                href="/"
                aria-current="page"
                onClick={() => {
                  setShowNavbar(false);
                }}
              >
                Home
              </Link>
            </li>
            {user && (
              <li class="nav-item">
                <Link
                  class="nav-link"
                  activeClassName={"active"}
                  // aria-current="page"
                  href="/shopping"
                  onClick={() => {
                    setShowNavbar(false);
                  }}
                >
                  Shopping
                </Link>
              </li>
            )}
            {/* <li class="nav-item">
              <Link
                class="nav-link"
                activeClassName={"active"}
                href="/settings"
                onClick={() => {
                  setShowNavbar(false);
                }}
              >
                Settings
              </Link>
            </li> */}
            {user && (
              <li class="nav-item">
                <Link
                  class="nav-link"
                  activeClassName={"active"}
                  href="/feedback"
                  onClick={() => {
                    setShowNavbar(false);
                  }}
                >
                  Feedback
                </Link>
              </li>
            )}
            <li class="nav-item">
              <Link
                class="nav-link"
                activeClassName={"active"}
                href="/about"
                onClick={() => {
                  setShowNavbar(false);
                }}
              >
                About
              </Link>
            </li>
            <li class="nav-item">
              <Link
                class="nav-link"
                activeClassName={"active"}
                href="/share"
                onClick={() => {
                  setShowNavbar(false);
                }}
              >
                Share the ❤️
              </Link>
            </li>
            {/* <li class="nav-item">
              <Link
                class="nav-link"
                activeClassName={"active"}
                href="/version"
                onClick={() => {
                  setShowNavbar(false);
                }}
              >
                Version
              </Link>
            </li> */}
            <li class="nav-item">
              <Link
                class="nav-link"
                activeClassName={"active"}
                href="/advanced"
                onClick={() => {
                  setShowNavbar(false);
                }}
              >
                Advanced
              </Link>
            </li>
            {showPrintThisPage && (
              <li class="nav-item">
                <Link
                  class="nav-link"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setShowNavbar(false);
                    try {
                      // Print for Safari browser
                      document.execCommand("print", false);
                    } catch (error) {
                      // Firefox?
                      console.error(
                        "Unable to use 'document.execCommand(print)'"
                      );
                      window.print();
                    }
                  }}
                >
                  Print this page
                </Link>
              </li>
            )}
            {user && !user.isAnonymous ? (
              <li class="nav-item">
                {auth && (
                  <a
                    class="nav-link"
                    href="#"
                    onClick={async () => {
                      await auth.signOut();
                    }}
                  >
                    <img
                      src={
                        user.photoURL
                          ? user.photoURL
                          : "/assets/icons/avatar.svg"
                      }
                      class="img-thumbnail"
                      width="30"
                      alt="Avatar"
                    />{" "}
                    Sign out ({user.email})
                  </a>
                )}
              </li>
            ) : (
              <li class="nav-item">
                {auth && (
                  <Link
                    href="/"
                    class="nav-link"
                    onClick={async (event) => {
                      event.preventDefault();
                      const provider = new firebase.auth.GoogleAuthProvider();
                      try {
                        await auth.signInWithRedirect(provider);
                      } catch (error) {
                        console.log("ERROR:", error);
                        route("/signin", true);
                      }
                    }}
                  >
                    Sign in with Google
                  </Link>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Header;
