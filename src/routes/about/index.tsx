import { FunctionalComponent, h } from "preact";
import * as style from "./style.css";
import { useEffect } from "preact/hooks";

import { GoBack } from "../../components/go-back";

const About: FunctionalComponent = () => {
  useEffect(() => {
    document.title = "About this app";
  });
  return (
    <div class={style.about}>
      <h1 class="display-1">About this app</h1>
      <p class="lead">
        A mobile web app to help families do grocery and meal planning.
        <br />
        Developed out of necessity by a family (Peter and Ashley) and used daily
        in their home.
      </p>
      <p>
        This app was built by Peter and Ashley Bengtsson in 2020 because they
        were sick and tired of the other options and a pieces of pen and paper
        just doesn&apos;t work when you don&apos;t always go straight from the
        home to the store.
        <br />
        Every other app was either buggy or annoying so this is an attempt to
        build exactly and only what they need, and{" "}
        <b>hopefully what many other families need too.</b>
      </p>

      <h3 class="display-3">Frequently asked questions</h3>
      <h4>Is it free?</h4>
      <p>
        <b>Yes</b> and there are <b>no plans to monetize</b> for the sake of a
        profit but considering that running the service isn&apos;t free, there
        might be a future chance of limitations or opportunity to donate
        financial aid.
      </p>

      <h4>Is it safe?</h4>
      <p>
        <b>Yes.</b> What you type in stays private with only you and whoever you
        decide to share your shopping list(s) with. The authentication and
        authorization is backed by{" "}
        <a
          href="https://firebase.google.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Firebase
        </a>
        . Obviously, there are no perfect promises on security.
      </p>

      <h4>Is it Open Source?</h4>
      <p>
        <b>Yes</b>. See{" "}
        <a
          href="https://github.com/peterbe/groce"
          target="_blank"
          rel="noopener noreferrer"
        >
          code on GitHub
        </a>
        . In fact, if you&apos;re familiar with GitHub you can use it to{" "}
        <a
          href="https://github.com/peterbe/groce/issues/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          submit bug reports and feature requests
        </a>
        .
      </p>

      <h4>Is there an iPhone/Android app?</h4>
      <p>
        <b>No.</b> But this web app is made to work great on mobile devices and
        you can use the &quot;Add to Home screen&quot; to turn it in a
        &quot;bookmark app&quot; which feels like an app.
      </p>
      <p>
        But also, unlike make iPhone/Android app, this web app works perfectly
        well in a regular desktop browser too.
      </p>

      <h4>Can I sign in without a Google account?</h4>
      <p>
        <b>No</b>, not at the moment. Most people have a Google account and
        it&apos;s nice that there are few choices for most people.
      </p>
      <p>
        However, it&apos;s possible to add many other forms of authentication
        with <b>Google Firebase</b> so if you have a need for another form of
        authentication, please do{" "}
        <a
          href="https://github.com/peterbe/groce/issues/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          contact us
        </a>
        .
      </p>

      <h4>Roadmap of upcoming features?</h4>
      <p>
        Nothing official yet. But let&apos;s build something together, not
        because it can be done but because it really makes your daily life
        better and easier. Let us know what matters.
      </p>

      <GoBack />
    </div>
  );
};

export default About;
