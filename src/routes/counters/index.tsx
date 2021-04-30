import { FunctionalComponent, h } from "preact";
import * as style from "./style.css";
import { useEffect, useRef, useState } from "preact/hooks";
import firebase from "firebase/app";
import rv from "rough-viz/dist/roughviz.min";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { GoBack } from "../../components/go-back";
import { Loading } from "../../components/loading";

dayjs.extend(relativeTime);

interface Props {
  db: firebase.firestore.Firestore | null;
}

type Counter = { [id: string]: number };

const Counters: FunctionalComponent<Props> = (props: Props) => {
  const { db } = props;
  useEffect(() => {
    document.title = "Counters";
  }, []);

  const [itemsDone, setItemsDone] = useState(new Map());
  const [listsCreated, setListsCreated] = useState(new Map());

  const now = new Date();

  const [year, month, day] = now.toISOString().split("T")[0].split("-");
  const thisYear = year;
  const thisMonth = `${year}-${month}`;
  const thisDay = `${year}-${month}-${day}`;

  useEffect(() => {
    if (db) {
      db.collection("counters")
        .doc("itemsDone")
        .onSnapshot(
          (snapshot) => {
            const data = snapshot.data() as Counter;
            const newItemsDone = new Map<string, number>();
            Object.entries(data).forEach(([key, value]) => {
              newItemsDone.set(key, value);
            });

            setItemsDone(newItemsDone);
          },
          (error) => {
            console.error("Error getting itemsDone snapshot", error);
          }
        );
      db.collection("counters")
        .doc("listsCreated")
        .onSnapshot(
          (snapshot) => {
            const data = snapshot.data() as Counter;
            const newListsCreated = new Map<string, number>();
            Object.entries(data).forEach(([key, value]) =>
              newListsCreated.set(key, value)
            );

            setListsCreated(newListsCreated);
          },
          (error) => {
            console.error("Error getting itemsDone snapshot", error);
          }
        );
    }
  }, [db]);

  if (!itemsDone.size || !listsCreated.size) {
    return <Loading text="Loading numbers..." />;
  }

  return (
    <div>
      <table
        class="table align-middle table-borderless"
        style={{ marginBottom: 100 }}
      >
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col" style={{ width: "20%" }}>
              Today
            </th>
            <th scope="col" style={{ width: "20%" }}>
              This month
            </th>
            <th scope="col" style={{ width: "20%" }}>
              This year
            </th>
            <th scope="col" style={{ width: "20%" }}>
              Ever
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Items done</th>
            <TDRow map={itemsDone} firstKey={thisDay} />
            <TDRow map={itemsDone} firstKey={thisMonth} />
            <TDRow map={itemsDone} firstKey={thisYear} />
            <TDRow map={itemsDone} firstKey={"ever"} />
          </tr>
          <tr>
            <th scope="row">Lists created</th>
            <TDRow map={listsCreated} firstKey={thisDay} />
            <TDRow map={listsCreated} firstKey={thisMonth} />
            <TDRow map={listsCreated} firstKey={thisYear} />
            <TDRow map={listsCreated} firstKey={"ever"} />
          </tr>
        </tbody>
      </table>

      <h3>All recent numbers</h3>
      <DayByDayNumberTable map={itemsDone} title="Items done" />
    </div>
  );
};

function TDRow({
  map,
  firstKey,
}: {
  map: Map<string, number>;
  firstKey: string;
}) {
  const value = map.get(firstKey) || 0;
  return (
    <td>
      <span class={style.number}>{value}</span>
    </td>
  );
}

let lastId = 0;

const generateId = (prefix: string) => `${prefix}${++lastId}`;

function DayByDayNumberTable({
  map,
  title,
  maxDays = 11,
}: {
  maxDays?: number;
  title: string;
  map: Map<string, number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [id] = useState(generateId("roughviz"));
  useEffect(() => {
    const node = ref.current;
    if (node) {
      const labels: string[] = [];
      const values: number[] = [];
      const date = new Date();
      const toKey = (d: Date) => d.toISOString().split("T")[0];
      const today = dayjs();
      while (labels.length < maxDays) {
        const value = map.get(toKey(date)) || 0;
        const thisDate = dayjs(date);
        const diffDates = today.diff(thisDate, "day");

        labels.push(
          diffDates === 0
            ? "today"
            : diffDates === 1
            ? "yesterday"
            : today.to(date)
        );
        values.push(value);
        date.setDate(date.getDate() - 1);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      new rv.BarH({
        element: `#${id}`,
        title,
        titleFontSize: "1.5rem",
        legend: false,
        // margin: { top: 50, bottom: 100, left: 160, right: 0 },
        data: {
          labels,
          values,
        },
        // xLabel: "Number",
        strokeWidth: 1,
        fillStyle: "zigzag-line",
        highlight: "gold",
        roughness: 1,
        width: Math.min(
          1000,
          document.querySelector("#app.container")?.clientWidth || 1000
        ),
      });
    }
    return () => {
      if (node) {
        while (node.firstChild) {
          node.removeChild(node.firstChild);
        }
      }
    };
  }, [map, id, title, maxDays]);

  return <div id={id} ref={ref} />;
}

const CountersOuter: FunctionalComponent<Props> = (props: Props) => {
  return (
    <div class={style.counters}>
      <h1>Counters</h1>
      <p class="lead">
        Number of things across the whole app. For the numerically nerdily
        inclined.
      </p>
      <Counters {...props} />

      <GoBack />
    </div>
  );
};

export default CountersOuter;
