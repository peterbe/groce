import { FunctionalComponent, createRef, h } from "preact";
import { useState, useEffect } from "preact/hooks";

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
    group: string
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
  const [editMode, setEditMode] = useState(false);

  const textInputRef = createRef();
  useEffect(() => {
    if (editMode && textInputRef.current) {
      (textInputRef.current as HTMLInputElement).focus();
    }
  }, [editMode]);

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
            updateItem(item, text, description, group);
            setEditMode(false);
          }}
        >
          <div class="mb-2">
            <input
              type="text"
              class="form-control"
              ref={textInputRef}
              value={text}
              onInput={({
                currentTarget,
              }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
                setText(currentTarget.value);
              }}
            />
          </div>
          <div class="mb-2">
            <textarea
              class="form-control"
              id="exampleFormControlTextarea1"
              placeholder="Description"
              value={description}
              onInput={({
                currentTarget,
              }: h.JSX.TargetedEvent<HTMLTextAreaElement, Event>) => {
                setDescription(currentTarget.value);
              }}
              rows={3}
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
      </li>
    );
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
        {/* <label htmlFor={`checkbox${item.id}`}>{item.text}</label> */}
        <span
          class={item.done ? style.done_item : undefined}
          onClick={() => {
            setEditMode(true);
          }}
        >
          {item.text}
          <br />
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
