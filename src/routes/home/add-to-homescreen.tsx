import { FunctionalComponent, h } from "preact";
import { useEffect, useState } from "preact/hooks";

const SESSIONSTORAGE_KEY = "embargoed-install-message";
export const AddToHomeScreen: FunctionalComponent = () => {
  const [showInstallMessage, setShowInstallMessage] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSIONSTORAGE_KEY)) {
        return;
      }
    } catch (error) {
      console.warn("Error getting from sessionStorage", error);
    }
    // Detects if device is on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);

    // Detects if device is in standalone mode
    const isInStandaloneMode =
      "standalone" in window.navigator && window.navigator["standalone"];

    // Checks if should display install popup notification:
    if (isIos && !isInStandaloneMode) {
      setShowInstallMessage(true);
    }
  }, []);

  function embargo() {
    try {
      sessionStorage.setItem(SESSIONSTORAGE_KEY, "true");
    } catch (error) {
      console.warn("Unable to setItem on sessionStorage", error);
    }
  }

  if (!showInstallMessage) {
    return null;
  }

  return (
    <ShowTip
      close={() => {
        embargo();
        setShowInstallMessage(false);
      }}
    />
  );
};

function ShowTip({ close }: { close: () => void }) {
  return (
    <div
      class="alert alert-info alert-dismissible fade show"
      role="alert"
      style={{ marginTop: 150 }}
    >
      <button
        type="button"
        class="btn-close"
        data-bs-dismiss="alert"
        aria-label="Close"
        onClick={() => {
          close();
        }}
      ></button>
      <h4 class="alert-heading">Pro tip!</h4>
      <p>
        Before you sign in, press the share icon in your browser and select
        <br />
        <b>Add to Home Screen</b>
      </p>
      <figure
        class="figure text-center"
        style={{ marginBottom: 0, textAlign: "center" }}
      >
        <img
          src={"/assets/share-icon.png"}
          class="figure-img img-fluid rounded"
          alt="Share icon in iOS Safari"
          loading="lazy"
        />
      </figure>
    </div>
  );
}
