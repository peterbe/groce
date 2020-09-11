import { FunctionalComponent, h } from "preact";
import { useState } from "preact/hooks";
import { Link } from "preact-router";

interface Props {
  heading: string;
  message: string | JSX.Element | Error;
  type?: "danger" | "warning" | "info" | "secondary" | "success";
  offerReload?: boolean;
}

export const Alert: FunctionalComponent<Props> = ({
  heading,
  message,
  type,
  offerReload,
}: Props) => {
  const [reloading, setReloading] = useState(false);
  return (
    <div class={`alert alert-${type || "danger"}`} role="alert">
      <h4 class="alert-heading">{heading}</h4>
      {message instanceof Error ? message.toString() : message}
      <hr />
      <p>
        <Link href="/" class="btn btn-outline-primary">
          Go back to <b>home page</b>
        </Link>
      </p>
      {offerReload && (
        <p>
          <button
            type="button"
            class="btn btn-danger"
            onClick={() => {
              setReloading(true);
              window.location.reload(true);
            }}
          >
            {reloading && (
              <span
                class="spinner-grow spinner-grow-sm"
                role="status"
                aria-hidden="true"
              ></span>
            )}
            {reloading ? " Reloading..." : "Try reloading"}
          </button>
        </p>
      )}
    </div>
  );
};
