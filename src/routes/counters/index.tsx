import { FunctionalComponent, h } from "preact";
import * as style from "./style.css";
import { useEffect, useState } from "preact/hooks";

import { GoBack } from "../../components/go-back";
import { Loading } from "../../components/loading";

interface Props {
  db: firebase.firestore.Firestore | null;
}

type Counter = { [id: string]: number };

// function getYesterday() {
//   const date = new Date();
//   date.setDate(date.getDate() - 1);
//   return date;
// }

// function getLastMonth() {
//   const date = new Date();
//   const currentMonth = date.getMonth();
//   while (currentMonth === date.getMonth()) {
//     date.setDate(date.getDate() - 1);
//   }
//   return date;
// }

// function getLastYear() {
//   const date = new Date();
//   const currentYear = date.getFullYear();
//   while (currentYear === date.getFullYear()) {
//     date.setDate(date.getDate() - 28);
//   }
//   return date;
// }

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

  // const yesterday = getYesterday();
  // const previousDaySplit = yesterday.toISOString().split("T")[0].split("-");
  // const previousDay = `${previousDaySplit[0]}-${previousDaySplit[1]}-${previousDaySplit[2]}`;

  // const lastMonth = getLastMonth();
  // const lastMonthSplit = lastMonth.toISOString().split("T")[0].split("-");
  // const previousMonth = `${lastMonthSplit[0]}-${lastMonthSplit[1]}`;

  // const lastYear = getLastYear();
  // const lastYearSplit = lastYear.toISOString().split("T")[0].split("-");
  // const previousYear = lastYearSplit[0];

  useEffect(() => {
    if (db) {
      db.collection("counters")
        .doc("itemsDone")
        .onSnapshot(
          (snapshot) => {
            const data = snapshot.data() as Counter;
            const newItemsDone = new Map<string, number>();
            Object.entries(data).forEach(([key, value]) =>
              newItemsDone.set(key, value)
            );
            // newItemsDone.set("ever", data["ever"] || 0);
            // newItemsDone.set(thisYear, data[thisYear] || 0);
            // // newItemsDone.set(previousYear, data[previousYear]);
            // newItemsDone.set(thisMonth, data[thisMonth] || 0);
            // // newItemsDone.set(previousMonth, data[previousMonth]);
            // newItemsDone.set(thisDay, data[thisDay] || 0);
            // // newItemsDone.set(previousDay, data[previousDay]);
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
            // newListsCreated.set("ever", data["ever"] || 0);
            // newListsCreated.set(thisYear, data[thisYear] || 0);
            // // newListsCreated.set(previousYear, data[previousYear]);
            // newListsCreated.set(thisMonth, data[thisMonth] || 0);
            // // newListsCreated.set(previousMonth, data[previousMonth]);
            // newListsCreated.set(thisDay, data[thisDay] || 0);
            // // newListsCreated.set(previousDay, data[previousDay]);
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

  // console.log(itemsDone);

  return (
    <div>
      <table
        class="table align-middle table-borderless"
        style={{ marginBottom: 100 }}
      >
        <thead>
          <tr>
            <th scope="col"></th>
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

      {/* <h4>All recent numbers</h4> */}
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
