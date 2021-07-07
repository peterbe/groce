import { FunctionalComponent, h } from "preact";
import { Link } from "preact-router";
import { useEffect } from "preact/hooks";

import style from "./style.css";
import { GoBack } from "../../components/go-back";

const About: FunctionalComponent = () => {
  useEffect(() => {
    document.title = "About this app";
  }, []);
  return (
    <div class={style.about}>
      <h1 class="display-1">About this app</h1>
      <p class="lead">
        A mobile web app to help families do grocery shopping and meal planning.
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

      <p>
        <Link href="/" class="btn btn-sm btn-outline-primary">
          &larr; Back to app
        </Link>
      </p>

      <h3 class="display-3">Features</h3>
      <h4>It&apos;s a to-do list</h4>
      <p>
        But it&apos;s perfected for home grocery shopping and family life.
        Suggestions are based on what you&apos;ve typed before and it&apos;s
        learning to make better suggestions based on what you often add to the
        list.
      </p>
      <figure class="figure">
        <img
          src="/lazy-assets/sample-list.png"
          class="figure-img img-fluid rounded shadow"
          alt="Screenshot showing a sample list"
          loading="lazy"
        />
        <figcaption class="figure-caption">
          Screenshot showing a sample list.
        </figcaption>
      </figure>
      <h4>
        Lists can have <b>co-owners</b>
      </h4>
      <p>
        Anybody can create a shopping list and call it whatever they want. Once
        created, you can invite friend, partner, spouse, whatever to be a
        co-owner of the list. It basically means you&apos;re sharing the list
        but you can still have lists only for yourself.
      </p>
      <figure class="figure">
        <img
          src="/lazy-assets/co-owners.png"
          class="figure-img img-fluid rounded shadow"
          alt="Screenshot listing co-owners"
          loading="lazy"
        />
        <figcaption class="figure-caption">
          Screenshot listing co-owners.
        </figcaption>
      </figure>

      <h4>
        Everything is <b>real-time</b>
      </h4>
      <p>
        What you enter immediately appears on everyone else&apos;s device who
        share the same shopping list.
      </p>

      <figure class="figure">
        <video
          autoPlay
          loop
          muted
          controls={true}
          style={{ width: "100%" }}
          class="shadow"
        >
          <source src="/lazy-assets/realtime.mp4" type="video/mp4" />
        </video>
        <figcaption class="figure-caption">
          Demo shows two different browsers viewing the same same shopping list.
        </figcaption>
      </figure>

      <h4>
        <b>Works offline</b>, but backs up to the cloud
      </h4>
      <p>
        Everything you save is first stored in your device and then immediately
        sent to the cloud, backed up to{" "}
        <a href="https://firebase.google.com/" rel="noopener noreferrer">
          Firebase
        </a>{" "}
        backed by{" "}
        <a href="https://cloud.google.com/" rel="noopener noreferrer">
          Google Cloud
        </a>
        .
      </p>
      <p>
        If you&apos;re in the store, where you don&apos;t have a signal (WiFi or
        data), it will not be able to synchronize it to the cloud unless you
        keep the app open till you have a signal. Or, you re-open the app once
        you&apos;re home so it gets a chance to back up. In other words, it
        works offline but it&apos;s not able to synchronize (back up) in the
        background.
      </p>

      <figure class="figure">
        <img
          src="/lazy-assets/offline-warning.png"
          class="figure-img img-fluid rounded shadow"
          alt="Screenshot showing offline warning"
          loading="lazy"
        />
        <figcaption class="figure-caption">
          Screenshot showing offline warning.
        </figcaption>
      </figure>

      <h4>A picture says more than a thousand words</h4>

      <p>
        You can attach picture(s) to each item. This is especially helpful when
        your partner puts something on your list but you&apos;re the one sent to
        the store.
      </p>

      <figure class="figure" style={{ marginRight: 10 }}>
        <img
          src="/lazy-assets/edit-with-picture.png"
          class="figure-img img-fluid rounded shadow"
          alt="Screenshot edit mode with a picture uploaded"
          loading="lazy"
        />
        <figcaption class="figure-caption">
          Screenshot edit mode with a picture uploaded.
        </figcaption>
      </figure>

      <figure class="figure">
        <img
          src="/lazy-assets/picture-modal.png"
          class="figure-img img-fluid rounded shadow"
          alt="Picture modal window"
          loading="lazy"
        />
        <figcaption class="figure-caption">Picture modal window.</figcaption>
      </figure>

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
