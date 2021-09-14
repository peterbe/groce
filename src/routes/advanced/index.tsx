import { h } from "preact";
import { Link } from "preact-router";

import { useEffect } from "preact/hooks";

import { GoBack } from "../../components/go-back";
import style from "./style.css";

function Version() {
  useEffect(() => {
    document.title = "Advanced Options";
  });

  return (
    <div class="list-group">
      <Link
        href="/version"
        class="list-group-item list-group-item-action d-flex gap-3 py-3"
      >
        <div class="d-flex gap-2 w-100 justify-content-between">
          <div>
            <h6 class="mb-0">Current version</h6>
            <p class="mb-0 opacity-75">
              Information about the current version you're running.
            </p>
          </div>
        </div>
      </Link>
      <Link
        href="/foodwords"
        class="list-group-item list-group-item-action d-flex gap-3 py-3"
      >
        <div class="d-flex gap-2 w-100 justify-content-between">
          <div>
            <h6 class="mb-0">Foodwords</h6>
            <p class="mb-0 opacity-75">
              Complete database of all food words used in ingredient photos.
            </p>
          </div>
        </div>
      </Link>
      <Link
        href="/counters"
        class="list-group-item list-group-item-action d-flex gap-3 py-3"
      >
        <div class="d-flex gap-2 w-100 justify-content-between">
          <div>
            <h6 class="mb-0">Counters</h6>
            <p class="mb-0 opacity-75">
              Statistical insight into global usage of this app.
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function VersionOuter(): h.JSX.Element {
  return (
    <div class={style.container}>
      <h1>Advanced options</h1>
      <Version />

      <GoBack />
    </div>
  );
}
