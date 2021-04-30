import { h } from "preact";
import * as style from "./style.css";

import { OwnerMetadata } from "../../types";

export function ShowOwners({
  uids,
  metadata,
}: {
  uids: string[];
  metadata: Record<string, OwnerMetadata>;
}) {
  if (uids.length === 1) {
    return <p class={style.list_owners}>Owners: just you</p>;
  }
  const images = uids.map((uid) => {
    const data = metadata[uid] || {};
    if (data.photoURL) {
      return (
        <img
          key={uid}
          class="rounded"
          width="30"
          src={data.photoURL || "/assets/icons/avatar.svg"}
          alt={data.displayName || data.email || uid}
        />
      );
    }
  });
  if (uids.length !== images.length) {
    return <p class={style.list_owners}>{uids.length} co-owners</p>;
  }
  return <p class={style.list_owners}>{images}</p>;
}
