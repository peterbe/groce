import { FunctionalComponent, h } from "preact";
import style from "./style.css";
import { useEffect, useState } from "preact/hooks";

import { GoBack } from "../../components/go-back";

const Settings: FunctionalComponent = () => {
  useEffect(() => {
    document.title = "Settings";
  });
  const [reloading, setReloading] = useState(false);
  return (
    <div class={style.settings}>
      <h1>Settings</h1>
      <p>
        <i>Sorry. At the moment there are no settings to set.</i>
      </p>

      <GoBack />
      <hr />

      <button
        type="button"
        class="btn btn-success"
        onClick={() => {
          setReloading(true);
          window.location.reload();
        }}
      >
        {reloading && (
          <span
            class="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          />
        )}
        {reloading && <span class="sr-only">Loading...</span>}
        Perform a full reload
      </button>
    </div>
  );
};

export default Settings;
