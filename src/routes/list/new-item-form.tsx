import { FunctionalComponent, h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";

import * as style from "./style.css";
import { ITEM_SUGGESTIONS, GROUP_SUGGESTIONS } from "./default-suggestions";
import { FirestoreItem, Item, List, SearchSuggestion } from "../../types";
import { stripEmojis } from "../../utils";

interface Props {
  ready: boolean;
  items: Item[] | null;
  saveHandler: (text: string) => void;
}

export const NewItemForm: FunctionalComponent<Props> = ({
  ready,
  items,
  saveHandler,
}: Props) => {
  const [newText, setNewText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const MAX_SUGGESTIONS = 4;

  useEffect(() => {
    if (!newText.trim()) {
      setSuggestions([]);
    } else {
      const newSuggestions: SearchSuggestion[] = [];
      const escaped = newText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rex = new RegExp(`\\b${escaped}`, "i");

      // Our hash table for avoiding dupes
      const newSuggestionsSet: Set<string> = new Set();

      if (items) {
        items.forEach((item, i) => {
          if (item.removed) {
            const normalized = stripEmojis(item.text.toLowerCase());
            if (
              rex.test(item.text) &&
              item.text.toLowerCase() !== newText.toLowerCase() &&
              !newSuggestionsSet.has(normalized)
            ) {
              newSuggestions.push({
                text: item.text,
                popularity: items.length - i,
              });
              newSuggestionsSet.add(normalized);
            }
          }
        });
      }
      if (newSuggestions.length < MAX_SUGGESTIONS) {
        // Add some brand new ones that have never been used but
        // assuming it's English we can suggest some
        ITEM_SUGGESTIONS.forEach((text) => {
          const normalized = stripEmojis(text.toLowerCase());
          if (
            rex.test(text) &&
            text.toLowerCase() !== newText.toLowerCase() &&
            !newSuggestionsSet.has(normalized)
          ) {
            newSuggestions.push({
              text,
              popularity: 0,
            });
            newSuggestionsSet.add(normalized);
          }
        });
      }

      setSuggestions(
        newSuggestions.slice(0, MAX_SUGGESTIONS).map((s) => s.text)
      );
    }
  }, [newText, items]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveHandler(newText);
        setNewText("");
      }}
    >
      <div class="input-group">
        <input
          type="search"
          class="form-control"
          value={newText}
          onInput={({
            currentTarget,
          }: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
            setNewText(currentTarget.value);
          }}
          aria-label="Text input with segmented dropdown button"
          placeholder="Add new item..."
          disabled={!ready}
        />
        <button
          type="submit"
          class="btn btn-outline-secondary"
          disabled={!newText.trim()}
        >
          Add
        </button>
      </div>

      <div class={style.search_suggestions}>
        {suggestions.length ? (
          <p>
            {suggestions.map((suggestion) => {
              return (
                <button
                  type="button"
                  class={`btn btn-sm btn-outline-secondary ${style.suggestion_button}`}
                  key={suggestion}
                  onClick={() => {
                    saveHandler(suggestion);
                    setNewText("");
                  }}
                >
                  {suggestion}?
                </button>
              );
            })}
          </p>
        ) : (
          // This min-height number I got from using the Web Inspector
          // when the p tag has buttons in it.
          <p style={{ minHeight: 31 }}>&nbsp;</p>
        )}
      </div>
    </form>
  );
};
