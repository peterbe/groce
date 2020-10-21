import { FunctionalComponent, h } from "preact";
import { useState } from "preact/hooks";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// import * as style from "./style.css";
// import { ITEM_SUGGESTIONS, GROUP_SUGGESTIONS } from "./default-suggestions";
import { Item } from "../../types";
// import { stripEmojis } from "../../utils";

dayjs.extend(relativeTime);

interface Props {
  items: Item[];
  close: () => void;
  maxAgeSeconds?: number;
}

interface ItemSummary {
  id: string;
  text: string;
  times_added: number;
  added: firebase.firestore.Timestamp[];
  frequency: number;
}

type SortKeys = "frequency" | "added" | "alphabetically";

const MIN_TIMES_ADDED = 2;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export const PopularityContest: FunctionalComponent<Props> = (props: Props) => {
  const { items, close } = props;
  const maxAgeSeconds = props.maxAgeSeconds || MAX_AGE_SECONDS;

  const [expandedItemId, setExpandedItemId] = useState("");
  const [sortBy, setSortBy] = useState<SortKeys>("frequency");
  const [sortReverse, setSortReverse] = useState(false);

  function toggleSortBy(key: SortKeys) {
    if (key !== sortBy) {
      setSortBy(key);
      setSortReverse(false);
    } else {
      setSortReverse(!sortReverse);
    }
  }

  const todaySeconds = new Date().getTime() / 1000;
  const itemsSummary: ItemSummary[] = items
    .filter((item) => {
      const added = item.added.filter(
        (d) => d.seconds >= todaySeconds - maxAgeSeconds
      );
      return added.length > MIN_TIMES_ADDED;
    })
    .map((item) => {
      const distances = item.added
        .slice(0, -1)
        .map((added, i) => added.seconds - item.added[i + 1].seconds);
      const movingMedianDistances = smm(
        distances,
        Math.min(4, distances.length)
      );
      const frequency = movingMedianDistances[movingMedianDistances.length - 1];
      return {
        id: item.id,
        text: item.text,
        added: item.added,
        times_added: item.times_added,
        frequency,
      };
    })
    .sort((a, b) => {
      const reverse = sortReverse ? -1 : 1;
      if (sortBy === "frequency") {
        return reverse * (a.frequency - b.frequency);
      } else if (sortBy === "added") {
        return reverse * (b.times_added - a.times_added);
      } else {
        return reverse * a.text.localeCompare(b.text);
      }
    });

  return (
    <div>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary"
        onClick={() => {
          close();
        }}
      >
        &larr; back to shopping list
      </button>
      <h4 style={{ marginTop: 20 }}>Popularity contest</h4>
      <small>Reflect on your most commonly added items</small>

      <table class="table table-sm">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Every...</th>
            <th scope="col">#</th>
          </tr>
        </thead>
        <tbody>
          {itemsSummary.map((itemSummary, i) => {
            const rows = [
              <tr key={itemSummary.id}>
                <td
                  onClick={() => {
                    setExpandedItemId(itemSummary.id);
                  }}
                >
                  {itemSummary.text}
                </td>
                <td>{formatFrequency(itemSummary.frequency)}</td>
                <td>{itemSummary.times_added}</td>
              </tr>,
            ];
            if (itemSummary.id === expandedItemId) {
              rows.push(
                <ExpandedRow
                  key={`${itemSummary.id}:expanded`}
                  itemSummary={itemSummary}
                  close={() => {
                    setExpandedItemId("");
                  }}
                />
              );
            }
            return rows;
          })}
        </tbody>
      </table>
      <p>
        <small>
          Only items added more than <b>{MIN_TIMES_ADDED} times</b> in the last{" "}
          <b>{formatFrequency(maxAgeSeconds)}</b> included (so,{" "}
          {items.length - itemsSummary.length} excluded).
        </small>
      </p>

      <div>
        Sort by{" "}
        <input
          type="radio"
          class="btn-check"
          name="options"
          id="option1"
          autoComplete="off"
          checked={sortBy === "frequency"}
          onClick={() => {
            toggleSortBy("frequency");
          }}
        />
        <label class="btn btn-sm btn-outline-secondary" htmlFor="option1">
          Frequency
        </label>{" "}
        <input
          type="radio"
          class="btn-check"
          name="options"
          id="option2"
          autoComplete="off"
          checked={sortBy === "added"}
          onClick={() => {
            toggleSortBy("added");
          }}
        />
        <label class="btn btn-sm btn-outline-secondary" htmlFor="option2">
          Times
        </label>{" "}
        <input
          type="radio"
          class="btn-check"
          name="options"
          id="option3"
          autoComplete="off"
          checked={sortBy === "alphabetically"}
          onClick={() => {
            toggleSortBy("alphabetically");
          }}
        />
        <label class="btn btn-sm btn-outline-secondary" htmlFor="option3">
          Text
        </label>
      </div>
    </div>
  );
};

function ExpandedRow({
  itemSummary,
  close,
}: {
  itemSummary: ItemSummary;
  close: () => void;
}) {
  return (
    <tr>
      <td colSpan={3}>
        <button
          class="btn btn-sm btn-outline-primary float-right"
          onClick={() => {
            close();
          }}
        >
          Close
        </button>
        <span>Last added...</span>
        <ul>
          {itemSummary.added.map((ts, i) => {
            const thisDate = dayjs(ts.toDate());

            const isLast = i + 1 >= itemSummary.added.length;
            const previousDate = isLast
              ? null
              : dayjs(itemSummary.added[i + 1].toDate());
            return (
              <li key={ts.seconds}>
                <span>{thisDate.fromNow()}</span>
                <br />
                <span style={{ paddingLeft: 40, fontStyle: "italic" }}>
                  {previousDate ? `↕ ${thisDate.to(previousDate, true)}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </td>
    </tr>
  );
}

function formatFrequency(seconds: number) {
  const days = seconds / 60 / 60 / 24;
  if (days > 14) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  return `${Math.ceil(days)} day${Math.ceil(days) === 1 ? "" : "s"}`;
}

function smm(arr: number[], range: number) {
  const num = range || arr.length;
  const res = [];
  const len = arr.length + 1;
  let idx = num - 1;
  while (++idx < len) {
    res.push(median(arr, idx, num));
  }
  return res;
}

function median(arr: number[], idx: number, range: number) {
  const arrSort = arr.slice(idx - range, idx).sort();
  const len = arrSort.length;
  const mid = Math.ceil(len / 2);

  return len % 2 == 0
    ? (arrSort[mid] + arrSort[mid - 1]) / 2
    : arrSort[mid - 1];
}

// function sma(arr: number[], range: number) {
//   if (!Array.isArray(arr)) {
//     throw TypeError("expected first argument to be an array");
//   }

//   // var fn = typeof format === 'function' ? format : toFixed;
//   var num = range || arr.length;
//   var res = [];
//   var len = arr.length + 1;
//   var idx = num - 1;
//   while (++idx < len) {
//     res.push(avg(arr, idx, num));
//   }
//   return res;
// }

// function avg(arr: number[], idx: number, range: number) {
//   return sum(arr.slice(idx - range, idx)) / range;
// }

// function sum(arr: number[]) {
//   var len = arr.length;
//   var num = 0;
//   while (len--) num += Number(arr[len]);
//   return num;
// }
