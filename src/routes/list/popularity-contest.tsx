import { FunctionalComponent, h } from "preact";
import { useState } from "preact/hooks";

// import * as style from "./style.css";
// import { ITEM_SUGGESTIONS, GROUP_SUGGESTIONS } from "./default-suggestions";
import { Item } from "../../types";
// import { stripEmojis } from "../../utils";

interface Props {
  items: Item[];
  close: () => void;
}

interface ItemSummary {
  id: string;
  text: string;
  times_added: number;
  frequency: number;
}

type SortKeys = "frequency" | "added" | "alphabetically";

export const PopularityContest: FunctionalComponent<Props> = ({
  items,
  close,
}: Props) => {
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

  const itemsSummary: ItemSummary[] = items
    .filter((item) => item.added.length > 2)
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
      <h4>Popularity contest</h4>
      <small>Reflect on your most commonly added items</small>

      <table class="table table-sm">
        <thead>
          <tr>
            {/* <th scope="col">#</th> */}
            <th scope="col">Item</th>
            <th scope="col">Every...</th>
            <th scope="col">#</th>
          </tr>
        </thead>
        <tbody>
          {itemsSummary.map((item, i) => {
            return (
              <tr key={item.id}>
                {/* <th scope="row">{i + 1}</th> */}
                <td>{item.text}</td>
                <td>{formatFrequency(item.frequency)}</td>
                <td>{item.times_added}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        <small>
          Only items added more than <b>twice</b> included (so,{" "}
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

function formatFrequency(seconds: number) {
  const days = seconds / 60 / 60 / 24;
  if (days > 14) {
    const weeks = Math.ceil(days / 7);
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
