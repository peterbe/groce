import { h } from "preact";
import { useState } from "preact/hooks";
import { Link } from "preact-router";

export function Alert({
  heading,
  message,
  type,
  offerReload,
  linkToHomepage = true,
}: {
  heading: string;
  message: string | h.JSX.Element | Error;
  type?: "danger" | "warning" | "info" | "secondary" | "success";
  offerReload?: boolean;
  linkToHomepage?: boolean;
}): h.JSX.Element {
  const [reloading, setReloading] = useState(false);
  return (
    <div class={`alert alert-${type || "danger"}`} role="alert">
      <h4 class="alert-heading">{heading}</h4>
      {message instanceof Error ? message.toString() : message}
      <hr />
      {linkToHomepage && (
        <p>
          <Link href="/" class="btn btn-outline-primary">
            Go back to <b>home page</b>
          </Link>
        </p>
      )}
      {offerReload && (
        <p>
          <button
            type="button"
            class="btn btn-danger"
            onClick={() => {
              setReloading(true);
              window.location.reload();
            }}
          >
            {reloading && (
              <span
                class="spinner-grow spinner-grow-sm"
                role="status"
                aria-hidden="true"
              />
            )}
            {reloading ? " Reloading..." : "Try reloading"}
          </button>
        </p>
      )}
    </div>
  );
}
