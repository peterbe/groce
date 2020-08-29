import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";

interface Props {
  text?: string;
  delay?: number;
}

export const Loading: FunctionalComponent<Props> = ({
  text = "Loading app...",
  delay = 300,
}: Props) => {
  const [stall, setStalled] = useState(delay > 0);
  useEffect(() => {
    let mounted = true;
    setTimeout(() => {
      if (mounted) {
        setStalled(false);
      }
    }, delay);
    return () => {
      mounted = false;
    };
  }, [delay]);

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
    const timeout = setTimeout(() => {
      if (!mounted) return;
      const index = colors.findIndex((c) => c === color);
      const nextColor = colors[(index + 1) % colors.length];

      setColor(nextColor);
    }, 1000);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [color, colors]);

  if (stall) {
    <div class="loading">
      <p>&nbsp;</p>
    </div>;
  }

  return (
    <div class="loading">
      <div class="text-center">
        <div
          class={`spinner-border ${color} m-5`}
          style="width: 3rem; height: 3rem;"
          role="status"
        >
          <span class="sr-only">{text}</span>
        </div>
      </div>
      <div class="text-center">
        <strong>{text}</strong>
      </div>
    </div>
  );
};
