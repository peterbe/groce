import { FunctionalComponent, h } from "preact";
import * as style from "./style.css";
import { useEffect } from "preact/hooks";

import { GoBack } from "../../components/go-back";

const Settings: FunctionalComponent = () => {
  useEffect(() => {
    document.title = "Settings";
  });
  return (
    <div class={style.settings}>
      <h1>Settings</h1>
      <p>
        <i>Sorry. At the moment there are no settings to set.</i>
      </p>

      <GoBack />
    </div>
  );
};

export default Settings;
