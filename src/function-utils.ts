export const USE_EMULATOR = process.env.PREACT_APP_USE_EMULATOR
  ? Boolean(JSON.parse(process.env.PREACT_APP_USE_EMULATOR))
  : false;

export const FUNCTION_BASE_URL = USE_EMULATOR
  ? "http://localhost:5001/thatsgroce/us-central1"
  : "https://us-central1-thatsgroce.cloudfunctions.net";
