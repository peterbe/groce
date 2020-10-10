import { FunctionalComponent, h } from "preact";
import * as style from "./style.css";
import { useEffect, useState } from "preact/hooks";
import copy from "copy-to-clipboard";

import { GoBack } from "../../components/go-back";

const ShareOuter: FunctionalComponent = () => {
  return (
    <div class={style.share}>
      <h2>Share the ❤️</h2>
      <Share />

      <GoBack />
    </div>
  );
};

export default ShareOuter;

const Share: FunctionalComponent = () => {
  const [absURL, setAbsURL] = useState("https://thatsgroce.web.app");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (copied) {
      setTimeout(() => {
        if (mounted) {
          setCopied(false);
        }
      }, 3 * 1000);
    }
    return () => {
      mounted = false;
    };
  }, [copied]);

  useEffect(() => {
    document.title = "Share the ❤️";
    const u = new URL("/", window.location.href);
    setAbsURL(u.toString());
  }, []);

  return (
    <div>
      <p class="lead">Well, at least share the app.</p>
      <p>The more people use it, the better it gets.</p>

      <WebShare />

      <div class="shadow p-3 mb-5 bg-white rounded">
        <h4>The URL</h4>
        <p class="text-center" style={{ fontSize: "120%", fontWeight: "bold" }}>
          <a href="/">{absURL}</a>
        </p>
        <button
          type="button"
          class={`btn btn-sm ${copied ? "btn-success" : "btn-primary"}`}
          onClick={() => {
            copy(absURL);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Click to copy"}
        </button>
      </div>
    </div>
  );
};

function WebShare() {
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState<Error | null>(null);
  const showShare = !!navigator.share;

  useEffect(() => {
    let mounted = true;
    if (shared || shareError) {
      setTimeout(() => {
        if (mounted) {
          if (shared) setShared(false);
          if (shareError) setShareError(null);
        }
      }, 10 * 1000);
    }
    return () => {
      mounted = false;
    };
  }, [shared, shareError]);

  function share() {
    const url = new URL("/", window.location.href);
    const data = {
      title: "That's Groce!",
      text: "Planning shopping and meals for the family.",
      url: url.toString(),
    };
    if (shareError) setShareError(null);
    try {
      navigator
        .share(data)
        .then(() => {
          setShared(true);
          if (shareError) setShareError(null);
        })
        .catch((e) => {
          setShareError(e);
        });
    } catch (error) {
      console.error("Error trying to navigator.share", error);
      setShareError(error);
    }
  }

  if (!showShare) {
    return null;
  }
  return (
    <div class={`shadow p-3 mb-5 bg-white rounded ${style.web_share}`}>
      <h4>
        Web Share <small>(Recommended)</small>
      </h4>
      <p>If you device supports it, this is easiest.</p>
      <button
        type="button"
        class={`btn ${
          shared ? "btn-success" : shareError ? "btn-warning" : "btn-primary"
        }`}
        onClick={() => {
          share();
        }}
      >
        Web Share
      </button>
      {shared && (
        <p>
          <small>Shared. Thank you!</small>
        </p>
      )}
      {shareError && <p>Share cancelled or didn&apos;t work. Oh well.</p>}
    </div>
  );
}
