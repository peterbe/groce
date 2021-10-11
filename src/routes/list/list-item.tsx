import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import party from "party-js";

import { Firestore } from "firebase/firestore";
import { FirebaseStorage } from "firebase/storage";

import { FileUpload } from "../../components/file-upload";
import style from "./style.css";
import type {
  Item,
  List,
  StorageSpec,
  openImageModalSignature,
} from "../../types";

import { DisplayImage } from "../../components/display-image";

dayjs.extend(relativeTime);

export function ListItem({
  item,
  list,
  db,
  storage,
  groupOptions,
  toggleDone,
  updateItem,
  updateItemImage,
  modified,
  disableGroups,
  disableQuantity,
  disableFireworks,
  openImageModal,
  deleteItem,
}: {
  item: Item;
  list: List;
  storage: FirebaseStorage | null;
  db: Firestore | null;
  groupOptions: string[];
  toggleDone: (item: Item) => void;
  updateItem: (
    item: Item,
    text: string,
    description: string,
    group: string,
    quantity: number
  ) => void;
  updateItemImage: (item: Item, spec: StorageSpec) => void;
  modified: null | Date;
  disableGroups: boolean;
  disableQuantity: boolean;
  disableFireworks: boolean;
  openImageModal: openImageModalSignature;
  deleteItem: (item: Item) => void;
}): h.JSX.Element {
  const [text, setText] = useState(item.text);
  const [description, setDescription] = useState(item.description);
  const [group, setGroup] = useState(item.group.text);
  const [quantity, setQuantity] = useState<string | number>(
    item.quantity || ""
  );

  const [editMode, setEditMode] = useState<
    "" | "text" | "description" | "group"
  >("");
  const [enableFileUpload, setEnableFileUpload] = useState(false);

  const recentlyAdded = new Date().getTime() / 1000 - item.added[0].seconds < 3;
  const recentlyModified =
    modified && (new Date().getTime() - modified.getTime()) / 1000 < 2;

  const [recentAddition, setRecentAddition] = useState(false);
  useEffect(() => {
    let mounted = true;
    if (recentlyAdded || recentlyModified) {
      setRecentAddition(true);
    }
    // After a little while, update `recentAddition` because otherwise
    // the DOM element is wrapped in a `<span class="rainbox_text_animated">
    // more or less "forever" which doesn't print well.
    setTimeout(() => {
      if (mounted) {
        setRecentAddition(false);
      }
    }, 3000);
    return () => {
      mounted = false;
    };
  }, [recentlyAdded, recentlyModified]);

  const textInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editMode) {
      if (editMode === "description") {
        if (descriptionInputRef.current) {
          descriptionInputRef.current.focus();
        }
      } else if (editMode === "group") {
        if (groupInputRef.current) {
          groupInputRef.current.focus();
        }
      } else if (textInputRef.current) {
        // Default is to focus on the text input
        textInputRef.current.focus();
      }
    }
  }, [editMode]);

  function getFilteredGroupOptions() {
    if (!group.trim()) {
      return groupOptions;
    }
    // Because the browser filtering is entirely `string.includes(otherstring)`
    // for a datalist, let's go beyond that a bit and weed out the bad matches.
    const escaped = group.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rex = new RegExp(`\\b${escaped}`, "i");
    return groupOptions.filter(
      (text) => rex.test(text) && text.toLowerCase() !== group.toLowerCase()
    );
  }

  const [checked, setChecked] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<Map<string, File>>(
    new Map()
  );

  if (editMode) {
    return (
      <li class={`list-group-item ${style.list_item_edit_mode}`}>
        {/* Commented out because it rarely works.
        It would be better to only show this if SOMEONE ELSE
        did the recent modification. */}
        {/* {recentlyModified && (
          <div class="alert alert-info" role="alert">
            <small>This was recently modified.</small>
          </div>
        )} */}
        <form
          // class="mb-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) {
              return;
            }
            const quantityNumber: number = isNaN(parseInt(`${quantity}`, 10))
              ? 0
              : parseInt(`${quantity}`, 10);
            updateItem(item, text, description, group, quantityNumber);
            setEditMode("");
          }}
        >
          <div class="mb-2">
            <input
              type="text"
              class="form-control"
              ref={textInputRef}
              value={text}
              onInput={(event) => {
                setText(event.currentTarget.value);
              }}
            />
          </div>

          {!disableQuantity && (
            <div class="mb-2">
              <div class="input-group">
                <span class="input-group-text" id="id_quantity">
                  Quantity
                </span>
                <input
                  type="number"
                  class="form-control"
                  placeholder="1"
                  aria-label="Quantity"
                  aria-describedby="id_quantity"
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(event.currentTarget.value);
                  }}
                />
                <button
                  class={`btn btn-outline-secondary ${style.quantity_button}`}
                  type="button"
                  onClick={() => {
                    setQuantity((prev) => {
                      if (!prev) {
                        return 2;
                      }
                      return parseInt(`${prev}`, 10) + 1;
                    });
                  }}
                >
                  +1
                </button>
                <button
                  class={`btn btn-outline-secondary ${style.quantity_button}`}
                  type="button"
                  onClick={() => {
                    setQuantity((prev) => {
                      const prevNumber = parseInt(`${prev}`, 10);
                      if (isNaN(prevNumber) || prevNumber === 2) {
                        return "";
                      }
                      return prevNumber - 1;
                    });
                  }}
                >
                  -1
                </button>
              </div>
            </div>
          )}

          <div class="mb-2">
            <textarea
              class="form-control"
              id="exampleFormControlTextarea1"
              placeholder="Description"
              ref={descriptionInputRef}
              value={description}
              onInput={(event) => {
                setDescription(event.currentTarget.value);
              }}
              rows={2}
            />
          </div>

          {!disableGroups && (
            <div class="mb-2">
              <input
                class="form-control"
                list="datalistOptions"
                placeholder="Group"
                ref={groupInputRef}
                value={group}
                onInput={(event) => {
                  setGroup(event.currentTarget.value);
                }}
              />
              <datalist id="datalistOptions">
                {getFilteredGroupOptions().map((value) => {
                  return <option key={value} value={value} />;
                })}
              </datalist>
            </div>
          )}
          {storage && item.images && item.images.length > 0 && (
            <div class="mb-2">
              <DisplayFilesEditMode
                item={item}
                images={item.images}
                imagesThumbnailData={item.imagesThumbnailData}
                updateItemImage={updateItemImage}
                openImageModal={openImageModal}
                uploadedFiles={uploadedFiles}
              />
            </div>
          )}

          {enableFileUpload && storage && db && (
            <div class="mb-2">
              <FileUpload
                db={db}
                storage={storage}
                list={list}
                item={item}
                onUploaded={({
                  file,
                  filePath,
                }: {
                  file: File;
                  filePath: string;
                }) => {
                  const newMap: Map<string, File> = new Map(uploadedFiles);
                  newMap.set(filePath, file);
                  setUploadedFiles(newMap);
                }}
                onSaved={() => {
                  setEnableFileUpload(false);
                }}
              />
            </div>
          )}

          <div class="mb-2">
            {!(!item.images || item.images.length >= 3) && (
              <div class="float-end">
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  onClick={() => {
                    setEnableFileUpload((p) => !p);
                  }}
                >
                  Picture
                </button>
              </div>
            )}
            <button
              type="submit"
              class="btn btn-primary"
              disabled={!text.trim()}
            >
              Save changes
            </button>{" "}
            <button
              type="button"
              class="btn btn-secondary"
              onClick={(event) => {
                event.stopPropagation();
                setEditMode("");
              }}
            >
              Cancel
            </button>{" "}
            <button
              type="button"
              class="btn btn-danger"
              title="Will delete this item from list"
              onClick={() => {
                deleteItem(item);
                setEditMode("");
              }}
            >
              Delete
            </button>
          </div>

          {!item.done && (
            <small class="fw-light">
              added {dayjs(item.added[0].toDate()).fromNow()}
            </small>
          )}
          {item.done && typeof item.done !== "boolean" && (
            <small class="fw-light">
              done {dayjs(item.done.toDate()).fromNow()}
            </small>
          )}
        </form>
      </li>
    );
  }

  function toggleDoneWrapper(item: Item) {
    if (item.done) {
      toggleDone(item);
    } else {
      setChecked(true);
      setTimeout(() => {
        toggleDone(item);
      }, 300);
    }
  }

  let cls = "list-group-item d-flex justify-content-between align-items-center";
  if (checked) {
    cls += ` ${style.poisoned}`;
  }

  return (
    <li class={cls}>
      <span>
        <input
          class="form-check-input list-item"
          id={`checkbox${item.id}`}
          type="checkbox"
          checked={!!item.done || checked}
          onClick={(event) => {
            // Because the whole <li> (that this is contained in) has an
            // onClick, we have to use this line otherwise the "parent"
            // onClick handler will also fire.
            event.stopPropagation();
            if (!item.done && !disableFireworks && event.target) {
              party.sparkles(event.target as HTMLElement, {
                // Defaults: Click "Configuration" on
                // https://party.js.org/docs/ref/templates
                // size: party.variation.range(0.5, 1.5),
                // Default is 100,200
                speed: party.variation.range(150, 250),
                // count: party.variation.range(5, 15)
                // Size of individual stars
                // size: party.variation.range(0.5, 1.5),

                // I wish I could control the range/radius too
                // https://github.com/yiliansource/party-js/issues/72
              });
            }
            toggleDoneWrapper(item);
          }}
          aria-label={item.text}
        />{" "}
        <span
          class={
            item.done
              ? style.done_item
              : recentAddition
              ? style.rainbow_text_animated
              : undefined
          }
        >
          <span
            class={`align-middle ${style.click_to_edit}`}
            onClick={() => {
              setEditMode("text");
            }}
          >
            {item.text}
          </span>{" "}
          {!disableQuantity && !!item.quantity && item.quantity !== 1 && (
            <b class="align-middle">x{item.quantity}</b>
          )}{" "}
          {/* <br/> */}
          {storage && item.images && item.images.length > 0 && (
            <span class="align-middle">
              <DisplayFilesViewMode
                images={item.images}
                imagesThumbnailData={item.imagesThumbnailData}
                openImageModal={openImageModal}
                uploadedFiles={uploadedFiles}
              />
            </span>
          )}
          {item.description && (
            <small
              class={`align-bottom ${style.item_description} ${style.click_to_edit}`}
              onClick={() => {
                setEditMode("description");
              }}
            >
              {item.description}
            </small>
          )}
        </span>
      </span>

      {!disableGroups && (
        <span
          onClick={() => {
            setEditMode("group");
          }}
          class={`badge ${
            item.group.text ? "bg-secondary" : "bg-light text-dark"
          } ${style.click_to_edit}`}
        >
          {item.group.text || "no group"}
        </span>
      )}
    </li>
  );
}

function DisplayFilesViewMode({
  images,
  openImageModal,
  uploadedFiles,
  imagesThumbnailData,
}: {
  images: string[];
  openImageModal: openImageModalSignature;
  uploadedFiles: Map<string, File>;
  imagesThumbnailData: { [image: string]: string } | undefined;
}) {
  return (
    <span>
      {images.map((filePath) => {
        return (
          <span key={filePath} style={{ paddingRight: 5 }}>
            <DisplayImage
              filePath={filePath}
              file={uploadedFiles.get(filePath)}
              placeholderImageData={
                imagesThumbnailData ? imagesThumbnailData[filePath] : undefined
              }
              openImageModal={openImageModal}
              // When looking at thumbnails in "edit mode" the width
              // of the thumbnails is 80. Re-use that here so if you
              // do switch from "view mode" to "edit mode", the thumbnails
              // there will hopefully already been downloaded and
              // browser-cached.
              thumbnailWidth={80}
              maxWidth={30}
              maxHeight={30}
              useObjectFit={true}
            />
          </span>
        );
      })}
    </span>
  );
}

function DisplayFilesEditMode({
  images,
  item,
  updateItemImage,
  openImageModal,
  uploadedFiles,
  imagesThumbnailData,
}: {
  images: string[];
  item: Item;
  updateItemImage: (item: Item, spec: StorageSpec) => void;
  openImageModal: openImageModalSignature;
  uploadedFiles: Map<string, File>;
  imagesThumbnailData: { [image: string]: string } | undefined;
}) {
  return (
    <ul class="list-group list-group-flush">
      {images.map((filePath) => {
        return (
          <li
            key={filePath}
            class="list-group-item d-flex justify-content-between align-items-center"
          >
            <DisplayImage
              filePath={filePath}
              file={uploadedFiles.get(filePath)}
              placeholderImageData={
                imagesThumbnailData ? imagesThumbnailData[filePath] : undefined
              }
              openImageModal={openImageModal}
              // Make sure this matches what we use in "view mode"
              // where it explicitly sets the `thumbnailWidth` to match
              // what's being used here:
              maxWidth={80}
              maxHeight={80}
              useObjectFit={true}
            />

            <button
              type="button"
              class="btn btn-warning btn-sm"
              onClick={() => {
                updateItemImage(item, { remove: filePath });
              }}
            >
              Delete
            </button>
          </li>
        );
      })}
    </ul>
  );
}
