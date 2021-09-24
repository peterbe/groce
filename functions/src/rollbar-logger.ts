import * as functions from "firebase-functions";
import * as Rollbar from "rollbar";

const { logger } = functions;
const rollbarConfig = functions.config().rollbar;

const rollbar = rollbarConfig
  ? new Rollbar({
      accessToken: rollbarConfig.accesstoken,
      captureUncaught: true,
      captureUnhandledRejections: true,
    })
  : null;

// log a generic message and send to rollbar
// if (rollbar) {
//   rollbar.log("Rollbar initialized!");
// }

export function logError(error: unknown, req?: functions.https.Request): void {
  if (process.env.FUNCTIONS_EMULATOR) {
    logger.debug("Rollbar disabled in emulator mode");
  } else if (rollbar) {
    if (error instanceof Error) {
      rollbar.error(error, req);
    } else {
      rollbar.error(new Error(String(error)), req);
    }
  } else {
    logger.debug("Rollbar NOT initialized, error:", error);
  }
}

export function wrappedLogError<T>(
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T> {
  return async function (...args: any[]) {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error);
      throw error;
    }
  };
}
