import { FunctionalComponent, h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import firebase from "firebase/app";

import { FileUpload } from "../../components/file-upload";
import * as style from "./style.css";
import { Item, List, StorageSpec } from "../../types";
import { useDownloadImageURL } from "./hooks";

interface Props {
  item: Item;
  list: List;
  storage: firebase.storage.Storage | null;
  db: firebase.firestore.Firestore | null;
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
  openImageModal: (url: string) => void;
}

export const ListItem: FunctionalComponent<Props> = ({
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
  openImageModal,
}: Props) => {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState("");
  const [quantity, setQuantity] = useState<string | number>("");
  const [editMode, setEditMode] = useState<
    "" | "text" | "description" | "group"
  >("");
  const [enableFileUpload, setEnableFileUpload] = useState(false);

  const recentlyAdded = new Date().getTime() / 1000 - item.added[0].seconds < 3;
  const recentlyModified =
    modified && (new Date().getTime() - modified.getTime()) / 1000 < 2;

  useEffect(() => {
    setText(item.text);
    setDescription(item.description);
    setGroup(item.group.text);
    setQuantity(item.quantity || "");
  }, [item]);

  const textInputRef = useRef<HTMLInputElement>();
  const descriptionInputRef = useRef<HTMLTextAreaElement>();
  const groupInputRef = useRef<HTMLInputElement>();
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
      } else {
        // Default is to focus on the text input
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
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
          class="mb-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) {
              return;
            }
            const quantityNumber: number = isNaN(parseInt(`${quantity}`))
              ? 0
              : parseInt(`${quantity}`);
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
                />
                <button
                  class={`btn btn-outline-secondary ${style.quantity_button}`}
                  type="button"
                  onClick={() => {
                    setQuantity((prev) => {
                      if (!prev) {
                        return 2;
                      } else {
                        return parseInt(`${prev}`) + 1;
                      }
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
                      const prevNumber = parseInt(`${prev}`);
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
            ></textarea>
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
                updateItemImage={updateItemImage}
                openImageModal={openImageModal}
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
                onClose={() => {
                  setEnableFileUpload(false);
                }}
              />
            </div>
          )}

          <div class="mb-2">
            {!(!item.images || item.images.length >= 3) && (
              <div class="float-right">
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
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      class="list-group-item d-flex justify-content-between align-items-center"
      // onClick={() => {
      //   setEditMode(true);
      // }}
    >
      <span>
        <input
          class="form-check-input list-item"
          id={`checkbox${item.id}`}
          type="checkbox"
          checked={item.done}
          onClick={(event) => {
            // Because the whole <li> (that this is contained in) has an
            // onClick, we have to use this line otherwise the "parent"
            // onClick handler will also fire.
            event.stopPropagation();

            toggleDone(item);
          }}
          aria-label={item.text}
        />{" "}
        <span
          class={
            item.done
              ? style.done_item
              : recentlyAdded || recentlyModified
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
                openImageModal={openImageModal}
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
};

function DisplayFilesViewMode({
  images,
  openImageModal,
}: {
  images: string[];
  openImageModal: (url: string) => void;
}) {
  return (
    <span>
      {images.map((path) => {
        return (
          <span key={path} style={{ paddingRight: 5 }}>
            <Image
              path={path}
              openImageModal={openImageModal}
              maxWidth={30}
              maxHeight={30}
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
}: {
  images: string[];
  item: Item;
  updateItemImage: (item: Item, spec: StorageSpec) => void;
  openImageModal: (url: string) => void;
}) {
  return (
    <ul class="list-group list-group-flush">
      {images.map((path) => {
        return (
          <li
            key={path}
            class="list-group-item d-flex justify-content-between align-items-center"
          >
            <Image
              path={path}
              openImageModal={openImageModal}
              maxWidth={80}
              maxHeight={80}
            />

            <button
              type="button"
              class="btn btn-warning btn-sm"
              onClick={() => {
                updateItemImage(item, { remove: path });
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

function Image({
  path,
  openImageModal,
  maxWidth,
  maxHeight,
}: {
  path: string;
  openImageModal: (url: string) => void;
  maxWidth: number;
  maxHeight: number;
}) {
  const { url: downloadURL } = useDownloadImageURL(path, 1000, false);
  const { url: thumbnailURL, error: thumbnailError } = useDownloadImageURL(
    path,
    100,
    true
  );

  if (thumbnailError) {
    <img alt={thumbnailError.toString()} style={{ maxWidth, maxHeight }} />;
  }

  const preloaded = new Map<string, boolean>();

  return (
    <a
      href={downloadURL || thumbnailURL}
      onClick={(event) => {
        event.preventDefault();
        openImageModal(downloadURL || thumbnailURL);
      }}
      onMouseOver={() => {
        if (!preloaded.has(downloadURL)) {
          preloaded.set(downloadURL, false);
          const preloadImg = new window.Image();
          preloadImg.src = downloadURL;
          if (preloadImg.decode) {
            preloadImg
              .decode()
              .then(() => {
                preloaded.set(downloadURL, true);
              })
              .catch(() => {
                preloaded.set(downloadURL, false);
              });
          } else {
            preloadImg.onload = () => {
              preloaded.set(downloadURL, true);
            };
          }
        }
      }}
    >
      <img
        class="img-thumbnail"
        style={{ width: maxWidth, height: maxHeight, "object-fit": "cover" }}
        src={thumbnailURL}
      />
    </a>
  );
}
