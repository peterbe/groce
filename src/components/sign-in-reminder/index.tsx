import { FunctionalComponent, h } from "preact";

import { Link } from "preact-router";
import firebase from "firebase/app";

import * as style from "./style.css";

interface Props {
  user: firebase.User;
  message: string;
}
export const SignInReminder: FunctionalComponent<Props> = ({
  user,
  message,
}: Props) => {
  if (!user.isAnonymous) {
    return null;
  }
  return (
    <div class={`${style.sign_in_reminder} text-right`}>
      <Link href="/signin" class="btn btn-sm btn-outline-primary">
        {message} &rarr;
      </Link>
    </div>
  );
};
