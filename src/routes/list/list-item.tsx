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
}

export const ListItem: FunctionalComponent<Props> = ({
  item,
  groupOptions,
  toggleDone,
  updateItem,
  modified,
}: Props) => {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState("");
  const [quantity, setQuantity] = useState<string | number>("");
  const [editMode, setEditMode] = useState(false);

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
  useEffect(() => {
    if (editMode && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editMode, textInputRef]);

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
            setEditMode(false);
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

          <div class="mb-2">
            <textarea
              class="form-control"
              id="exampleFormControlTextarea1"
              placeholder="Description"
              value={description}
              onInput={(event) => {
                setDescription(event.currentTarget.value);
              }}
              rows={2}
            ></textarea>
          </div>

          <div class="mb-2">
            <input
              class="form-control"
              list="datalistOptions"
              placeholder="Group"
              value={group}
              onInput={({
                currentTarget,
              }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                setGroup(currentTarget.value);
              }}
            />
            <datalist id="datalistOptions">
              {groupOptions.map((value) => {
                return <option key={value} value={value} />;
              })}
            </datalist>
          </div>
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
                setEditMode(false);
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
      onClick={() => {
        setEditMode(true);
      }}
    >
      <span>
        <input
          class="form-check-input mr-1"
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
          {item.text}{" "}
          {!!item.quantity && item.quantity !== 1 && <b>x{item.quantity}</b>}{" "}
          {/* <br/> */}
          {item.description && (
            <small class={style.item_description}>{item.description}</small>
          )}
        </span>
      </span>

      <span
        class={
          item.group.text ? "badge bg-secondary" : "badge bg-light text-dark"
        }
      >
        {item.group.text || "no group"}
      </span>
    </li>
  );
};
