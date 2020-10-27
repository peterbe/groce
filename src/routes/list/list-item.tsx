import { FunctionalComponent, h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";

import * as style from "./style.css";
import { Item } from "../../types";

interface Props {
  item: Item;
  groupOptions: string[];
  toggleDone: (item: Item) => void;
  updateItem: (
    item: Item,
    text: string,
    description: string,
    group: string,
    quantity: number
  ) => void;
  modified: null | Date;
  disableGroups: boolean;
  disableQuantity: boolean;
}

export const ListItem: FunctionalComponent<Props> = ({
  item,
  groupOptions,
  toggleDone,
  updateItem,
  modified,
  disableGroups,
  disableQuantity,
}: Props) => {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState("");
  const [quantity, setQuantity] = useState<string | number>("");
  // const [editMode, setEditMode] = useState(false);
  const [editMode, setEditMode] = useState<
    "" | "text" | "description" | "group"
  >("");

  const recentlyAdded = new Date().getTime() / 1000 - item.added[0].seconds < 3;
  const recentlyModified =
    modified && (new Date().getTime() - modified.getTime()) / 1000 < 3;

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
        {recentlyModified && (
          <div class="alert alert-info" role="alert">
            <small>This was recently modified.</small>
          </div>
        )}
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

          <div class="mb-2">
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
            <b>x{item.quantity}</b>
          )}{" "}
          {/* <br/> */}
          {item.description && (
            <small
              class={`${style.item_description} ${style.click_to_edit}`}
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
