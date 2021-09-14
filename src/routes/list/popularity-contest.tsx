import { h } from "preact";
import { useState } from "preact/hooks";
import { Timestamp } from "firebase/firestore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { Item } from "../../types";

dayjs.extend(relativeTime);

interface ItemSummary {
  id: string;
  text: string;
  times_added: number;
  added: Timestamp[];
  frequency: number;
}

type SortKeys = "frequency" | "added" | "alphabetically";

const MIN_TIMES_ADDED = 3;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // ~3 months

type getItemsSummaryOptions = {
  maxAgeSeconds?: number;
  sortBy?: string;
  sortReverse?: boolean;
};
export function getItemsSummary(
  items: Item[],
  {
    maxAgeSeconds = MAX_AGE_SECONDS,
    sortBy = "frequency",
    sortReverse = false,
  }: getItemsSummaryOptions
): ItemSummary[] {
  const todaySeconds = new Date().getTime() / 1000;
  const itemsSummary: ItemSummary[] = [];
  for (const item of items) {
    // Exclude those that are too long ago and of the remaining ones,
    // reduce it down to a list of "clusters".
    const added = reduceTooClose(
      item.added.filter((d) => d.seconds >= todaySeconds - maxAgeSeconds)
    );

    if (added.length < MIN_TIMES_ADDED) {
      continue;
    }

    const distances = added
      .slice(0, -1)
      .map((added, i) => added.seconds - item.added[i + 1].seconds);

    const movingMedianDistances = smm(distances, Math.min(4, distances.length));
    const frequency = movingMedianDistances[movingMedianDistances.length - 1];

    itemsSummary.push({
      id: item.id,
      text: item.text,
      added,
      times_added: added.length,
      frequency,
    });
  }
  itemsSummary.sort((a, b) => {
    const reverse = sortReverse ? -1 : 1;
    if (sortBy === "frequency") {
      return reverse * (a.frequency - b.frequency);
    } else if (sortBy === "added") {
      return reverse * (b.times_added - a.times_added);
    }
    return reverse * a.text.localeCompare(b.text);
  });
  return itemsSummary;
}

function reduceTooClose(
  dates: Timestamp[],
  minDistanceSeconds = 60 * 60
): Timestamp[] {
  const checked: Timestamp[] = [];
  let previous: null | Timestamp = null;
  for (const date of dates) {
    if (!previous) {
      checked.push(date);
      previous = date;
      continue;
    }
    const diffSeconds = previous.seconds - date.seconds;
    if (diffSeconds > minDistanceSeconds) {
      checked.push(date);
    }
    previous = date;
  }
  return checked;
}

export function PopularityContest({
  items,
  close,
  maxAgeSeconds,
}: {
  items: Item[];
  close: () => void;
  maxAgeSeconds?: number;
}): h.JSX.Element {
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

  const itemsSummary = getItemsSummary(items, {
    maxAgeSeconds: maxAgeSeconds || MAX_AGE_SECONDS,
    sortBy,
    sortReverse,
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

      {itemsSummary.length ? (
        <Table itemsSummary={itemsSummary} />
      ) : (
        <p style={{ margin: "50px 5px", textAlign: "center" }}>
          <i>Not enough popular items at the moment</i>
        </p>
      )}
      <p>
        <small>
          Only items added more than <b>{MIN_TIMES_ADDED} times</b> in the last{" "}
          <b>{formatFrequency(maxAgeSeconds || MAX_AGE_SECONDS)}</b> included
          (so, {items.length - itemsSummary.length} excluded).
        </small>
      </p>

      {!!itemsSummary.length && (
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
          <label
            class="btn btn-sm btn-outline-secondary"
            htmlFor="option1"
            style={
              sortBy === "frequency" && sortReverse
                ? { transform: "rotate(-180deg)" }
                : undefined
            }
          >
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
          <label
            class="btn btn-sm btn-outline-secondary"
            htmlFor="option2"
            style={
              sortBy === "added" && sortReverse
                ? { transform: "rotate(-180deg)" }
                : undefined
            }
          >
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
          <label
            class="btn btn-sm btn-outline-secondary"
            htmlFor="option3"
            style={
              sortBy === "alphabetically" && sortReverse
                ? { transform: "rotate(-180deg)" }
                : undefined
            }
          >
            Text
          </label>
        </div>
      )}
    </div>
  );
}

// function omitTooCloseItems(minDistance: number, sequence: number[]) {
//   const checked: number[] = [];
//   // Given a sequence of numbers like
//   //   [1, 4, 45, 87, 88, 89, 156]
//   // you can see that some numbers are "too close".
//   // For example, [1,4] are just 3 apart. And [87,88,89] is just 1 apart.
//   // So instead return a new sequence were these too-close ones are omitted.
//   // E.g.
//   //   [1, 45, 87, 156]
//   //

//   let previous: number | null = null;
//   for (const current of sequence) {
//     if (previous !== null) {
//       if (current - previous < minDistance) {
//         continue;
//       }
//     }
//     previous = current;
//     checked.push(current);
//   }

//   return checked;
// }

function Table({ itemsSummary }: { itemsSummary: ItemSummary[] }) {
  const [expandedItemId, setExpandedItemId] = useState("");
  return (
    <table class="table table-sm">
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Every...</th>
          <th scope="col">#</th>
        </tr>
      </thead>
      <tbody>
        {itemsSummary.map((itemSummary) => {
          const rows = [
            <tr key={itemSummary.id}>
              <td
                onClick={() => {
                  if (expandedItemId === itemSummary.id) {
                    setExpandedItemId("");
                  } else {
                    setExpandedItemId(itemSummary.id);
                  }
                }}
                style={
                  expandedItemId === itemSummary.id
                    ? { fontWeight: "bold" }
                    : undefined
                }
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
  );
}

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
          class="btn btn-sm btn-outline-primary float-end"
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
