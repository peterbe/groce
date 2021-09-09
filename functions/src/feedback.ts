import * as functions from "firebase-functions";
import * as postmark from "postmark";

import { wrappedLogError } from "./rollbar-logger";

type FeedbackSubmission = {
  subject: string;
  topic: string;
  text: string;
  user: {
    displayName?: string;
    email?: string;
  };
};

export const onFeedbackAdded = functions.firestore
  .document("feedback/{feedbackID}")
  .onCreate(
    wrappedLogError(async (snap, context) => {
      const data = snap.data() as FeedbackSubmission;
      const client = new postmark.Client(
        functions.config().postmark.server_api_token
      );

      const response = await client.sendEmail({
        From: "That's Groce! <mail@peterbe.com>",
        To: "peterbe@gmail.com",
        Subject: `New feedback on That's Groce!: ${data.subject}`,
        TextBody: `Feedback ID: ${context.params.feedbackID}
Subject: ${data.subject}
Topic: ${data.topic}
Text: ${data.text}
User: ${data.user.displayName || "*no name*"} (${data.user.email ||
          "*no email*"})

Sent: ${new Date().toLocaleString()}`
      });
      console.log("sendEmail response:", response);
    })
  );

// export const onFeedbackSubmitted = functions.firestore
//   .document("feedback/{feedbackID}")
//   .onCreate((snapshot, context) => {
//     const data = snapshot.data();
//     console.log(
//       `Feedback created: feedbackID=${
//         context.params.feedbackID
//       } data=${JSON.stringify(data)}`
//     );

//     return Promise.resolve("Nothing updated.");
//   });
