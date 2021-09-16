import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import {
  doc,
  Firestore,
  collection,
  addDoc,
  Timestamp,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import {
  FirebaseStorage,
  StorageError,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { Item, List } from "../../types";
import style from "./style.css";

const MAX_FILE_SIZE = 1024 * 1024 * 10; // ~10MB

function getImageFullPath(prefix: string, id: string, file: File) {
  const t = new Date();
  const yyyy = t.getFullYear();
  const mm = t.getMonth() + 1;
  const dd = t.getDate();

  let ext = "";
  if (file.type === "image/jpeg") ext = "jpg";
  else if (file.type === "image/png") ext = "png";
  else throw new Error(`Unrecognized type (${file.type})`);
  const ts = Math.floor(new Date().getTime());
  return `${prefix}/${yyyy}/${zeroPad(mm)}/${zeroPad(dd)}/${id}-${ts}.${ext}`;
}
function zeroPad(num: number, places = 2): string {
  return `${num}`.padStart(places, "0");
}

export function FileUpload({
  db,
  storage,
  item,
  list,
  prefix = "image-uploads",
  onSaved,
  onUploaded,
  disabled = false,
}: {
  db: Firestore;
  storage: FirebaseStorage;
  item: Item | null;
  list: List;
  prefix?: string;
  onUploaded: ({ file, filePath }: { file: File; filePath: string }) => void;
  onSaved?: () => void;
  disabled?: boolean;
}): h.JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<Error | null>(
    null
  );
  const [uploadingPercentage, setUploadingPercentage] = useState<number | null>(
    null
  );
  const [uploadError, setUploadError] = useState<StorageError | null>(null);

  function validateFile(file: File) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      throw new Error(`Unrecognized file type (${file.type})`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `Too large (${humanFileSize(file.size)} > ${humanFileSize(
          MAX_FILE_SIZE
        )})`
      );
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemID = item ? item.id : null

  useEffect(() => {
    if (file && db && storage) {
      const metadata = {
        contentType: file.type,
      };

      const filePath = getImageFullPath(prefix, item ? item.id : list.id, file);
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Observe state change events such as progress, pause, and resume
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadingPercentage(Math.ceil(progress));
          // switch (snapshot.state) {
          //   case firebase.storage.TaskState.PAUSED: // or 'paused'
          //     console.log("Upload is paused");
          //     break;
          //   case firebase.storage.TaskState.RUNNING: // or 'running'
          //     console.log("Upload is running");
          //     break;
          // }
        },
        (error) => {
          setUploadError(error);
        },
        async () => {
          onUploaded({ file, filePath });
          if (item) {
            await updateDoc(
              doc(db, `shoppinglists/${list.id}/items`, item.id),
              {
                images: arrayUnion(filePath),
              }
            );
            // .then(() => {
            //   if (onSaved) {
            //     onSaved();
            //   }
            // })
            // .catch((error) => {
            //   // XXX Deal with this better.
            //   console.error(`Error trying to update item ${item.id}:`, error);
            // });
            if (onSaved) {
              onSaved();
            }
          } else {
            try {
              await addDoc(
                collection(db, `shoppinglists/${list.id}/pictures`),
                {
                  filePath,
                  notes: "",
                  created: Timestamp.fromDate(new Date()),
                  modified: Timestamp.fromDate(new Date()),
                }
              );
            } catch (error) {
              console.error("Error trying to save picture", error);
              throw error;
            }
            setFile(null);
            setFileValidationError(null);
            setUploadError(null);
            setUploadingPercentage(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            if (onSaved) {
              onSaved();
            }
            // db.collection(`shoppinglists/${list.id}/pictures`)
            //   .add({
            //     filePath,
            //     notes: "",
            //     created: Timestamp.fromDate(new Date()),
            //     modified: Timestamp.fromDate(new Date()),
            //   })
            //   .then(() => {
            //     setFile(null);
            //     setFileValidationError(null);
            //     setUploadError(null);
            //     setUploadingPercentage(null);
            //     if (fileInputRef.current) {
            //       fileInputRef.current.value = "";
            //     }
            //     if (onSaved) {
            //       onSaved();
            //     }
            //   })
            //   .catch((error) => {
            //     console.error("Error trying to save picture", error);
            //     throw error;
            //   });
          }
        }
      );
    }
  }, [prefix, file, list.id, itemID, storage, db]);

  return (
    <div class={`${style.file_upload}`}>
      {/* <label for="formFile" class="form-label">
        Picture file
      </label> */}
      <input
        class="form-control"
        type="file"
        id="formFile"
        ref={fileInputRef}
        disabled={disabled}
        // Maybe change this to list image/png, image/jpeg, ...
        accept="image/jpeg, image/png"
        onInput={({
          currentTarget,
        }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
          if (currentTarget.files) {
            const file = currentTarget.files[0];
            try {
              validateFile(file);
              setFileValidationError(null);
            } catch (error) {
              console.warn("Problem with file validation", error);
              setFileValidationError(
                error instanceof Error ? error : new Error(String(error))
              );
              return;
            }
            setFile(file);
          }
        }}
      />
      {fileValidationError && (
        <div class="alert alert-danger" role="alert">
          File error: <code>{fileValidationError.toString()}</code>
        </div>
      )}
      {file && (
        <small>
          {humanFileSize(file.size)} {file.type} picked
        </small>
      )}
      {uploadingPercentage !== null && (
        <div class="progress" style={{ height: 5 }}>
          <div
            class={`progress-bar progress-bar-striped progress-bar-animated ${
              uploadingPercentage >= 99 ? "bg-success" : ""
            }`}
            role="progressbar"
            aria-valuenow={`${uploadingPercentage}`}
            aria-valuemin="0"
            aria-valuemax="100"
            style={`width: ${uploadingPercentage}%`}
          >
            {/* {uploadingPercentage}% */}
          </div>
        </div>
      )}
      <DisplayUploadError error={uploadError} />
    </div>
  );
}

function DisplayUploadError({ error }: { error: StorageError | null }) {
  if (!error) {
    return null;
  }
  const message = error.message;

  return (
    <div class="alert alert-danger" role="alert">
      Upload error: {message}
    </div>
  );
}

function humanFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const num = size / Math.pow(1024, i);
  const round = Math.round(num);
  const numStr: string | number =
    round < 10 ? num.toFixed(2) : round < 100 ? num.toFixed(1) : round;
  return `${numStr} ${"KMGTPEZY"[i - 1]}B`;
}
