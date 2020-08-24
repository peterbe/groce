const KEYS = [
  "apiKey",
  "authDomain",
  "databaseURL",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
  "measurementId",
];

const OPTIONAL = new Set(["measurementId"]);
export const firebaseConfig = fromEntries(
  KEYS.map((key) => {
    const envKey = `PREACT_APP_FIREBASE_${key.toUpperCase()}`;
    const value = process.env[envKey];
    if (!value && !OPTIONAL.has(key)) {
      const hint =
        "In your .env file, create something like:\n\n" +
        `${envKey}=…value…\n\n`;
      throw new Error(`Expected ${envKey} to be set to something.\n${hint}`);
    }
    return [key, value];
  })
);

function fromEntries<T>(iterable: Array<[string, T]>): { [key: string]: T } {
  return [...iterable].reduce<{ [key: string]: T }>((obj, [key, val]) => {
    obj[key] = val;
    return obj;
  }, {});
}
