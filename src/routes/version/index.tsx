import { FunctionalComponent, h } from "preact";
import * as style from "./style.css";
import { useEffect } from "preact/hooks";

import { GoBack } from "../../components/go-back";

const Version: FunctionalComponent = () => {
  useEffect(() => {
    document.title = "Current version";
  });

  const version = process.env.PREACT_APP_GIT_VERSION_INFO;
  if (!version) {
    return (
      <div>
        <p>
          <i>Sorry. The current version is not set in this release.</i>
        </p>
      </div>
    );
  }
  const [sha, date] = version.split("|").map((x) => x.trim());
  const shaShort = sha.slice(0, 7);
  const parsed = new Date(date);
  const absURL = `https://github.com/peterbe/groce/commit/${sha}`;

  return (
    <div>
      <p>
        The current version is:
        <br />
        <a href={absURL} rel="noopener noreferrer">
          {shaShort}
        </a>
        <br />
        and it was released ({parsed.toDateString()})
      </p>
    </div>
  );
};

const VersionOuter: FunctionalComponent = () => {
  return (
    <div class={style.current_version}>
      <h1>Current version</h1>
      <Version />

      <GoBack />
    </div>
  );
};

export default VersionOuter;
