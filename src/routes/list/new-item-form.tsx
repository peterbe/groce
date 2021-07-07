import { FunctionalComponent, h } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";

import style from "./style.css";
import { ITEM_SUGGESTIONS } from "./default-suggestions";
import { Item, SearchSuggestion } from "../../types";
import { stripEmojis } from "../../utils";
import { getItemsSummary } from "./popularity-contest";

interface Props {
  ready: boolean;
  items: Item[] | null;
  saveHandler: (text: string) => void;
  disableDefaultSuggestions: boolean;
}

export const NewItemForm: FunctionalComponent<Props> = ({
  ready,
  items,
  saveHandler,
  disableDefaultSuggestions,
}: Props) => {
  const [newText, setNewText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const MAX_SUGGESTIONS = 4;

  const mostPopularTexts: string[] = useMemo(
    () =>
      items
        ? getItemsSummary(items, { sortReverse: true }).map((x) => x.text)
        : [],
    [items]
  );

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
        items.forEach((item) => {
          if (item.removed) {
            const normalized = stripEmojis(item.text.toLowerCase());
            if (
              rex.test(item.text) &&
              item.text.toLowerCase() !== newText.toLowerCase() &&
              !newSuggestionsSet.has(normalized)
            ) {
              newSuggestions.push({
                text: item.text,
                // The `mostPopularTexts` is a sorted list of strings. The
                // *last* string in the list is the most frequently used.
                // Use findIndex to turn that into a simple integer.
                // The Math.max() is to make sure that items that *have*
                // been used before, but not so frequently always gets at
                // least a popularity of 1 or more.
                popularity: Math.max(
                  mostPopularTexts.findIndex((t) => t === item.text),
                  1
                ),
              });
              newSuggestionsSet.add(normalized);
            }
          }
        });
      }
      if (
        !disableDefaultSuggestions &&
        newSuggestions.length < MAX_SUGGESTIONS
      ) {
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
              // Things that have never been used always gets the lowest
              // possible popularity number.
              popularity: 0,
            });
            newSuggestionsSet.add(normalized);
          }
        });
      }

      // Sort by highest popularity number first
      newSuggestions.sort((a, b) => b.popularity - a.popularity);

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
                  {suggestion}
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
