import { FunctionalComponent, h } from "preact";
import * as style from "./style.css";

export const OfflineWarning: FunctionalComponent = () => {
  return (
    <p class={style.offline_warning}>
      Some changes stuck offline. Keep the app open to sync!
    </p>
  );
};
