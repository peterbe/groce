import { FunctionalComponent, h } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";

import style from "./style.css";
import { ITEM_SUGGESTIONS } from "./default-suggestions";
import { Item, SearchSuggestion } from "../../types";
import { stripEmojis } from "../../utils";
import type { ItemSummary } from "./popularity-contest";
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
  const [hideSuggestions, setHideSuggestions] = useState(false);

  const MAX_SUGGESTIONS = 4;

  const mostPopular: ItemSummary[] = useMemo(
    () => (items ? getItemsSummary(items, { sortReverse: true }) : []),
    [items]
  );
  const mostPopularTexts = mostPopular.map((x) => x.text);
  const mostPopularMap: Map<string, ItemSummary> = new Map(
    mostPopular.map((summary) => {
      return [stripEmojis(summary.text.toLowerCase()), summary];
    })
  );

  useEffect(() => {
    if (!newText.trim()) {
      if (items) {
        // Suggest items that are popular but haven't been added recently
        const premptiveSuggestions: SearchSuggestion[] = [];

        const now = new Date();
        const tested = new Set<string>();
        items.forEach((item) => {
          if (item.removed || item.done) {
            const normalized = stripEmojis(item.text.toLowerCase());
            // Because an item can appear more than once with the same
            // text, we only
            if (tested.has(normalized)) {
              return;
            }
            tested.add(normalized);

            // possibilities
            const summary = mostPopularMap.get(normalized);
            if (!summary || summary.added.length < 2) {
              return;
            }
            const lastAdded = summary.added[0].toDate();
            const distance = (now.getTime() - lastAdded.getTime()) / 1000;
            if (summary.frequency < distance) {
              premptiveSuggestions.push({
                text: item.text,
                popularity: Math.max(
                  mostPopularTexts.findIndex((t) => t === item.text),
                  1
                ),
              });
            }
          }
        });

        // Sort by highest popularity number first
        premptiveSuggestions.sort((a, b) => b.popularity - a.popularity);

        setSuggestions(
          premptiveSuggestions.slice(0, MAX_SUGGESTIONS).map((s) => s.text)
        );
      } else {
        setSuggestions([]);
      }
    } else {
      // setPreemptiveSuggestions(false);
      const newSuggestions: SearchSuggestion[] = [];
      const escaped = newText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rex = new RegExp(`\\b${escaped}`, "i");

      // Our hash table for avoiding dupes
      const newSuggestionsSet: Set<string> = new Set();

      if (items) {
        items.forEach((item) => {
          if (item.removed || item.done) {
            const normalized = stripEmojis(item.text.toLowerCase());
            if (
              rex.test(item.text) &&
              // item.text.toLowerCase() !== newText.toLowerCase() &&
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
        const alreadyOnListNormalized = new Set(
          (items || [])
            .filter((item) => {
              return !item.removed;
            })
            .map((item) => {
              return stripEmojis(item.text.toLowerCase());
            })
        );

        // assuming it's English we can suggest some
        ITEM_SUGGESTIONS.forEach((text) => {
          const normalized = stripEmojis(text.toLowerCase());
          if (
            rex.test(text) &&
            // text.toLowerCase() !== newText.toLowerCase() &&
            !newSuggestionsSet.has(normalized) &&
            !alreadyOnListNormalized.has(normalized)
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

  // Every time `hideSuggestions` becomes true, we set it back to false
  // after a little delay.
  // The reason is that once you've clicked a suggestion, that button
  // will disappear and if it's not the right-most one in the list
  // a new one will take its place and the user won't notice.
  // So by hiding all suggestions briefly after one has been chosen, it
  // hopefully feels like a new computed set of suggestions appears.
  useEffect(() => {
    let mounted = true;
    if (hideSuggestions) {
      setTimeout(() => {
        if (mounted) {
          setHideSuggestions(false);
        }
      }, 300);
    }
    return () => {
      mounted = false;
    };
  }, [hideSuggestions]);

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
          onInput={(event) => {
            setNewText(event.currentTarget.value);
          }}
          aria-label="New shopping list item"
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
        {suggestions.length > 0 && !hideSuggestions ? (
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
                    setHideSuggestions(true);
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
          <p style={{ minHeight: 37 }}>&nbsp;</p>
        )}
      </div>
    </form>
  );
};
