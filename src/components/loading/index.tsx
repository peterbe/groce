import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import * as style from "./style.css";

const Loading: FunctionalComponent = () => {
  const colors = [
    "text-success",
    "text-primary",
    "text-secondary",
    "text-info",
    "text-warning",
  ];
  const [color, setColor] = useState(colors[0]);
  useEffect(() => {
    let mounted = true;
    setTimeout(() => {
      if (!mounted) return;
      const index = colors.findIndex((c) => c === color);
      const nextColor = colors[(index + 1) % colors.length];

      setColor(nextColor);
    }, 1000);
    return () => {
      mounted = false;
    };
  }, [color, colors]);

  return (
    <div class={style.loading}>
      <div class="text-center">
        <div
          class={`spinner-border ${color} m-5`}
          style="width: 3rem; height: 3rem;"
          role="status"
        >
          <span class="sr-only">Loading...</span>
        </div>
      </div>
      <div class="text-center">
        <strong>Loading app...</strong>
      </div>
    </div>
  );
};

export default Loading;
