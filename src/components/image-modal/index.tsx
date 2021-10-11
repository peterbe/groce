import { h, Fragment } from "preact";
import { useEffect } from "preact/hooks";

import { DisplayImageTag } from "../display-image";

export function ImageModal({
  url,
  file,
  close,
}: {
  url: string;
  file: File | undefined;
  close: () => void;
}) {
  function keydownHandler(event: KeyboardEvent) {
    if (event.code === "Escape") {
      close();
    }
  }
  useEffect(() => {
    if (url) {
      document.body.classList.add("modal-open");
      document.addEventListener("keydown", keydownHandler);
    } else {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", keydownHandler);
    }
    return () => {
      document.removeEventListener("keydown", keydownHandler);
    };
  }, [url]);
  if (!url) {
    return null;
  }
  return (
    <Fragment>
      <div
        class="modal fade show"
        tabIndex={-1}
        style={{ display: "block" }}
        role="dialog"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <button
                type="button"
                class="btn-close"
                data-dismiss="modal"
                aria-label="Close"
                onClick={() => close()}
              />
            </div>
            <div class="modal-body">
              <DisplayImageTag
                style={{ maxWidth: "100%" }}
                url={url}
                file={file}
              />
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                data-dismiss="modal"
                onClick={() => close()}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" />
    </Fragment>
  );
}
