import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";

import style from "./style.css";

interface Props {
  delay?: number;
  text?: string;
}
export const OfflineWarning: FunctionalComponent<Props> = ({
  delay = 1,
  text = "Some changes stuck offline. Keep the app open to sync!",
}: Props) => {
  const [waited, setWaited] = useState(delay === 0);
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) {
        setWaited(true);
      }
    }, delay * 1000);
    return () => {
      mounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [delay]);
  if (!waited) {
    return null;
  }

  return <p class={style.offline_warning}>{text}</p>;
};
