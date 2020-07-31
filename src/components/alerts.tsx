import { FunctionalComponent, JSX, h } from "preact";
import { Link } from "preact-router";

interface Props {
  heading: string;
  message: string | JSX.Element;
  type?: "danger" | "warning" | "info" | "secondary";
}

export const Alert: FunctionalComponent<Props> = ({
  heading,
  message,
  type,
}: Props) => {
  return (
    <div class={`alert alert-${type || "danger"}`} role="alert">
      <h4 class="alert-heading">{heading}</h4>
      {message}
      <hr />
      <p class="mb-0">
        <Link href="/" class="btn btn-outline-primary">
          Go back to <b>home page</b>
        </Link>
      </p>
    </div>
  );
};
