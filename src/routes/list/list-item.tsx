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
}

export const ListItem: FunctionalComponent<Props> = ({
  item,
  groupOptions,
  toggleDone,
  updateItem,
}: Props) => {
  const [text, setText] = useState(item.text);
  const [description, setDescription] = useState(item.description);
  const [group, setGroup] = useState(item.group.text);
  const [quantity, setQuantity] = useState<string | number>(
    item.quantity || ""
  );
  const [editMode, setEditMode] = useState(false);
  const [updated, setUpdated] = useState(0);
  const [ignoreUpdatedWarning, toggleIgnoreUpdatedWarning] = useState(false);

  useEffect(() => {
    setUpdated((before) => before + 1);
  }, [item]);
  const hasChanged = updated > 1;

  const textInputRef = useRef<HTMLInputElement>();
  useEffect(() => {
    if (editMode && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editMode, textInputRef]);

  if (editMode) {
    return (
      <li class="list-group-item">
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
              onClick={() => {
                setEditMode(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
        {hasChanged && !ignoreUpdatedWarning && (
          <div class="alert alert-success" role="alert">
            <h4 class="alert-heading">Watch out!</h4>
            <p>This item has changed since you started editing.</p>
            <hr />
            <p class="mb-0">
              <button
                type="button"
                class="btn btn-sm btn-primary"
                onClick={() => {
                  setText(item.text);
                  setDescription(item.description);
                  setGroup(item.group.text);
                  setUpdated(1);
                }}
              >
                Reload
              </button>{" "}
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                onClick={() => {
                  toggleIgnoreUpdatedWarning(true);
                }}
              >
                Ignore
              </button>
            </p>
          </div>
        )}
      </li>
    );
  }

  function recentlyAdded(item: Item) {
    const age = new Date().getTime() / 1000 - item.added[0].seconds;
    return age < 2;
  }

  return (
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <span>
        <input
          class="form-check-input mr-1"
          id={`checkbox${item.id}`}
          type="checkbox"
          checked={item.done}
          onClick={() => {
            toggleDone(item);
          }}
          aria-label={item.text}
        />{" "}
        <span
          class={
            item.done
              ? style.done_item
              : recentlyAdded(item)
              ? style.rainbow_text_animated
              : undefined
          }
          onClick={() => {
            setEditMode(true);
          }}
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
        onClick={() => {
          setEditMode(true);
        }}
      >
        {item.group.text || "no group"}
      </span>
    </li>
  );
};
