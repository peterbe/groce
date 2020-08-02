import { FunctionalComponent, h } from "preact";
import { Link } from "preact-router";
import * as style from "./style.css";

interface Props {
  name?: string;
  url?: string;
}

export const GoBack: FunctionalComponent<Props> = ({
  name = "home",
  url = "/",
}: Props) => {
  return (
    <div class={style.goback}>
      <Link href={url} class="btn btn-outline-primary">
        &larr; Back to {name}
      </Link>
    </div>
  );
};
