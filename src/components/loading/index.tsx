import { FunctionalComponent, h } from "preact";
import { useState, useEffect } from "preact/hooks";

interface Props {
  text?: string;
  delay?: number;
  reloadDelay?: number;
  minHeight?: number;
}

const COLORS = [
  "text-success",
  "text-primary",
  "text-secondary",
  "text-info",
  "text-warning",
];

export const Loading: FunctionalComponent<Props> = ({
  text = "Loading app...",
  delay = 1500,
  reloadDelay = 0,
  minHeight = 0,
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

  const [reloading, setReloading] = useState(false);

  const [offerReload, setOfferReload] = useState(false);
  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;
    if (reloadDelay) {
      timer = window.setTimeout(() => {
        if (mounted) {
          setOfferReload(true);
        }
      }, reloadDelay);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      mounted = false;
    };
  }, [reloadDelay]);

  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (!mounted) return;
      const index = COLORS.findIndex((c) => c === color);
      const nextColor = COLORS[(index + 1) % COLORS.length];

      setColor(nextColor);
    }, 1000);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [color]);

  const style: h.JSX.CSSProperties = {};
  if (minHeight > 0) {
    style.minHeight = minHeight;
  }

  if (stall) {
    return (
      <div class="loading" style={style}>
        <p>&nbsp;</p>
      </div>
    );
  }

  return (
    <div class="loading" style={style}>
      <div class="text-center">
        <div
          class={`spinner-border ${color} m-5`}
          style="width: 3rem; height: 3rem;"
          role="status"
        >
          <span class="visually-hidden">{text}</span>
        </div>
      </div>
      <div class="text-center">
        <strong>{text}</strong>
      </div>
      {offerReload ? (
        <div class="text-center">
          <p>Seems to be taking forever.</p>
          <a
            href="/"
            class="btn btn-warning"
            onClick={(event) => {
              event.preventDefault();
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
            Try reloading
          </a>
        </div>
      ) : (
        <p>
          <small>
            <a
              href="."
              onClick={() => {
                window.location.reload();
              }}
            >
              Try reloading the page
            </a>
          </small>
        </p>
      )}
    </div>
  );
};
