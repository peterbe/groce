import { FunctionalComponent, h } from "preact";
import { useState } from "preact/hooks";
import { Link } from "preact-router/match";
// import * as style from "./style.css";
import firebase from "firebase/app";

interface Props {
  user: firebase.User | null;
  auth: firebase.auth.Auth | null;
}

const Header: FunctionalComponent<Props> = (props: Props) => {
  const { user, auth } = props;

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSigninMenu, setShowSigninMenu] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);

  return (
    <nav
      // class="navbar navbar-expand-lg navbar-light bg-light"
      class="navbar  fixed-bottom navbar-light bg-light"
      style={{ backgroundColor: "#e3f2fd" }}
    >
      <div class="container-fluid">
        <Link class="navbar-brand" href="/">
          <img
            src={"../assets/icons/favicon-32x32.png"}
            width="30"
            height="30"
            class="d-inline-block align-top"
            alt=""
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
          <span class="navbar-toggler-icon"></span>
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
                >
                  Shopping
                </Link>
              </li>
            )}

            {auth && !user && (
              <li class="nav-item dropdown">
                <a
                  class={
                    showSigninMenu
                      ? "nav-link dropdown-toggle show"
                      : "nav-link dropdown-toggle"
                  }
                  href="#"
                  id="navbarDropdownSignin"
                  role="button"
                  data-toggle="dropdown"
                  aria-expanded="false"
                  onClick={() => {
                    setShowSigninMenu(!showSigninMenu);
                  }}
                >
                  Sign in
                </a>
                <ul
                  class={
                    showSigninMenu ? "dropdown-menu show" : "dropdown-menu"
                  }
                  aria-labelledby="navbarDropdownSignin"
                >
                  <li>
                    <a
                      class="dropdown-item"
                      href="#"
                      onClick={async () => {
                        const provider = new firebase.auth.GoogleAuthProvider();
                        try {
                          await auth.signInWithPopup(provider);
                          // route('/', true)
                        } catch (error) {
                          console.log("ERROR:", error);
                        }
                      }}
                    >
                      Popup
                    </a>
                  </li>
                  <li>
                    <a
                      class="dropdown-item"
                      href="#"
                      onClick={async () => {
                        const provider = new firebase.auth.GoogleAuthProvider();
                        try {
                          await auth.signInWithRedirect(provider);
                        } catch (error) {
                          console.log("ERROR:", error);
                        }
                      }}
                    >
                      Redirect
                    </a>
                  </li>
                </ul>
              </li>
            )}

            {user && auth && (
              <li class="nav-item dropdown">
                <a
                  class={
                    showUserMenu
                      ? "nav-link dropdown-toggle show"
                      : "nav-link dropdown-toggle"
                  }
                  href="#"
                  id="navbarDropdown"
                  role="button"
                  data-toggle="dropdown"
                  aria-expanded="false"
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                  }}
                >
                  <img
                    src={
                      user.photoURL
                        ? user.photoURL
                        : "../assets/icons/avatar.svg"
                    }
                    class="img-thumbnail"
                    width="30"
                    alt="Avatar"
                  />
                </a>
                <ul
                  class={showUserMenu ? "dropdown-menu show" : "dropdown-menu"}
                  aria-labelledby="navbarDropdown"
                >
                  <li>
                    <a
                      class="nav-link disabled"
                      href="#"
                      aria-disabled="true"
                      title={user.email ? `Email: ${user.email}` : undefined}
                    >
                      {user.displayName}
                    </a>
                  </li>
                  <li>
                    <hr class="dropdown-divider" />
                  </li>
                  <li>
                    <Link class="dropdown-item" href="/settings">
                      Settings
                    </Link>
                  </li>
                  <li>
                    <hr class="dropdown-divider" />
                  </li>
                  <li>
                    <a
                      class="dropdown-item"
                      href="#"
                      onClick={async () => {
                        await auth.signOut();
                      }}
                    >
                      Sign out
                    </a>
                  </li>
                </ul>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
  // return (
  //   <header class={style.header}>
  //     <h1>That&apos;s Groce!</h1>
  //     <nav>
  //       <Link activeClassName={style.active} href="/">
  //         Home
  //       </Link>
  //       <Link activeClassName={style.active} href="/profile">
  //         Me
  //       </Link>
  //       <Link activeClassName={style.active} href="/profile/john">
  //         John
  //       </Link>
  //     </nav>
  //   </header>
  // );
};

export default Header;
