import { FunctionalComponent, h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import * as style from "./style.css";
import firebase from "firebase/app";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import weekOfYear from "dayjs/plugin/weekOfYear";
// import calendar from "dayjs/plugin/calendar";
import isToday from "dayjs/plugin/isToday";
import isTomorrow from "dayjs/plugin/isTomorrow";
import isYesterday from "dayjs/plugin/isYesterday";

import { Alert } from "../../components/alerts";
import { GoBack } from "../../components/go-back";
import { Loading } from "../../components/loading";
import { SignInReminder } from "../../components/sign-in-reminder";
import { OfflineWarning } from "../../components/offline-warning";
import { MenuOptions } from "./menu-options";
import {
  FirestoreMeal,
  Meal,
  RecipeSource,
  Menu,
  // StorageSpec,
} from "../../types";
// import { stripEmojis } from "../../utils";

dayjs.extend(relativeTime);
dayjs.extend(weekOfYear);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
// dayjs.extend(calendar)

interface Props {
  user: firebase.User | false | null;
  db: firebase.firestore.Firestore | null;
  storage: firebase.storage.Storage | null;
  id: string;
  menus: Menu[] | null;
}

const MenuApp: FunctionalComponent<Props> = ({
  user,
  db,
  storage,
  id,
  menus,
}: Props) => {
  const [meals, setMeals] = useState<Meal[] | null>(null);

  const menu = menus ? menus.find((menu) => menu.id === id) : null;
  const menuNotFound = menus && !menu;
  const menuError = menus && !menu && menus.length;
  const notYourMenu = !menu && menus;

  const [mealsError, setMealsError] = useState<Error | null>(null);

  const [editAction, toggleEditAction] = useState(false);
  const [editGroups, toggleEditGroups] = useState(false);
  // const [popularityContest, setPopularityContest] = useState(false);

  useEffect(() => {
    if (menuNotFound) {
      document.title = "🤮 Menu not found";
    } else if (menuError) {
      document.title = `💩 Menu error!`;
    } else if (editAction) {
      document.title = "Menu options";
    } else if (menu) {
      // const countTodoItems = meals
      //   ? items.filter((i) => !i.removed && !i.done).length
      //   : 0;
      // document.title = countTodoItems
      //   ? `(${countTodoItems}) ${list.name}`
      //   : `${list.name}`;
      document.title = menu.name;
    } else {
      document.title = "Menu";
    }
  }, [meals, menu, menuNotFound, menuError, editAction]);

  const [snapshotsOffline, toggleSnapshotsOffline] = useState(false);

  const [recentlyModifiedItems, setRecentlyModifiedItems] = useState<
    Map<string, Date>
  >(new Map());

  useEffect(() => {
    let ref: () => void;
    if (db && menu) {
      ref = db.collection(`menus/${id}/meals`).onSnapshot(
        // { includeMetadataChanges: true },
        (snapshot) => {
          if (
            snapshot.metadata.fromCache &&
            snapshot.metadata.hasPendingWrites
          ) {
            toggleSnapshotsOffline(true);
          } else {
            toggleSnapshotsOffline(false);
          }

          const newMeals: Meal[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as FirestoreMeal;
            const recipeSources = data.recipeSources as RecipeSource[];
            const meal = {
              id: doc.id,
              text: data.text,
              date: data.date,
              recipeSources: recipeSources,
              favorite: data.favorite,
              added: data.added,
              images: data.images || [],
            };
            newMeals.push(meal);
          });

          newMeals.sort((a, b) => a.date.getTime() - b.date.getTime());

          setMeals(newMeals);

          snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
              // const newRecentlyModifiedItems = new Map(recentlyModifiedItems);
              const newRecentlyModifiedItems = new Map();
              newRecentlyModifiedItems.set(change.doc.id, new Date());
              setRecentlyModifiedItems(newRecentlyModifiedItems);
              // console.log("RECENTLY UPDATED", change.doc.data().text);
            }
          });
        },
        (error) => {
          console.error("Snapshot error:", error);
          setMealsError(error);
        }
      );
    }
    return () => {
      if (ref) {
        ref();
      }
    };
  }, [id, menu, user, db, storage]);

  function addNewMeal(text: string) {
    throw new Error("not implemented");
  }

  const [modalImageURL, setModalImageURL] = useState("");
  function openImageModal(url: string) {
    setModalImageURL(url);
  }
  function closeImageModal() {
    setModalImageURL("");
  }

  if (user === false) {
    return (
      <div class={style.list}>
        <Alert
          heading={"You're not signed in"}
          message={<p>Use the menu bar below to sign in first.</p>}
        />
      </div>
    );
  }

  if (notYourMenu) {
    return (
      <div class={style.list}>
        <Alert
          heading={"Not your menu"}
          message={
            <p>
              You&apos;re not an owner or co-owner of menu <code>{id}</code>
            </p>
          }
        />
      </div>
    );
  }

  if (menuNotFound) {
    return (
      <div class={style.list}>
        <Alert
          heading={"Menu not found"}
          message={
            <p>
              No menu by the ID <code>{id}</code>
            </p>
          }
        />
      </div>
    );
  }
  if (menuError) {
    return (
      <div class={style.list}>
        <Alert
          heading={"Menu error"}
          message={
            <p>
              List error: <code>{menuError.toString()}</code>{" "}
            </p>
          }
          offerReload={true}
        />
      </div>
    );
  }

  return (
    <div class={style.list}>
      {snapshotsOffline && <OfflineWarning />}

      <p class={`${style.menu_options_button} float-right hide-in-print`}>
        <button
          type="button"
          class={editAction ? "btn btn-sm btn-info" : "btn btn-sm"}
          onClick={() => {
            toggleEditAction(!editAction);
          }}
        >
          {editAction ? "Close" : "Menu options"}
        </button>
      </p>
      {menu && <h2>{menu.name} </h2>}

      {db && user && menu && editAction && (
        <MenuOptions
          db={db}
          user={user}
          menu={menu}
          close={() => {
            toggleEditAction(false);
          }}
        />
      )}

      {mealsError && (
        <Alert
          heading="Meals error"
          message={
            <p>
              Meals error: <code>{mealsError.toString()}</code>
            </p>
          }
          offerReload={true}
        />
      )}

      {!meals && !mealsError && <Loading text="Loading meals..." />}

      {meals && !editAction && db && menu && (
        <ListAllMeals meals={meals} menu={menu} db={db} storage={storage} />
      )}

      {db && user && (
        <SignInReminder user={user} message="Sign in to not lose your menu" />
      )}

      {!menus || menus.length === 1 ? (
        <GoBack url="/" name="home" />
      ) : (
        <GoBack url="/menus" name="menus" />
      )}

      <ImageModal url={modalImageURL} close={closeImageModal} />
    </div>
  );
};

export default MenuApp;

function ImageModal({ url, close }: { url: string; close: () => void }) {
  function keydownHandler(event: KeyboardEvent) {
    if (event.code === "Escape") {
      close();
    }
  }
  useEffect(() => {
    if (url) {
      document.body.classList.add("modal-open");
      document.addEventListener("keydown", keydownHandler);
    } else {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", keydownHandler);
    }
    return () => {
      document.removeEventListener("keydown", keydownHandler);
    };
  }, [url]);
  if (!url) {
    return null;
  }
  return (
    <Fragment>
      <div
        class="modal fade show"
        tabIndex={-1}
        style={{ display: "block" }}
        role="dialog"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <button
                type="button"
                class="btn-close"
                data-dismiss="modal"
                aria-label="Close"
                onClick={() => close()}
              ></button>
            </div>
            <div class="modal-body">
              <img src={url} style={{ maxWidth: "100%" }} />
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                data-dismiss="modal"
                onClick={() => close()}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </Fragment>
  );
}

type WeekDay = {
  date: dayjs.Dayjs;
  meals: Meal[];
};

function showWeekRelation(date: dayjs.Dayjs, startsOnAMonday: boolean) {
  const startOfWeek = dayjs()
    .startOf("days")
    .day(startsOnAMonday ? 1 : 0);
  let diffDays = date.diff(startOfWeek, "days");
  // console.log(diffDays, date.format("YYYY/MM/DD"), date.format());
  if (diffDays === 0) {
    return "this week";
  }
  if (diffDays === -7) {
    return "last week";
  }
  if (diffDays === -14) {
    return "last last week";
  }
  if (diffDays === 6 || diffDays === 7) {
    return "next week";
  }
  if (diffDays === 14) {
    return "next next week";
  }
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 0) {
    return `${Math.abs(weeks)} weeks ago`;
  }
  return `in ${weeks} weeks`;
}

function dates2DOMID(date1: dayjs.Dayjs, date2: dayjs.Dayjs) {
  return `w${date1.format("YYYYMMDD")}${date2.format("YYYYMMDD")}`;
}

function ListAllMeals({
  meals,
  menu,
  db,
  storage,
}: {
  meals: Meal[];
  menu: Menu;
  storage: firebase.storage.Storage | null;
  db: firebase.firestore.Firestore;
}) {
  const [firstDay, setFirstDay] = useState<dayjs.Dayjs>(dayjs().startOf("day"));
  const [lastDay, setLastDay] = useState<dayjs.Dayjs>(dayjs().endOf("day"));

  const { startsOnAMonday } = menu.config;

  useEffect(() => {
    const startOfThatWeek =
      firstDay.day() === 0 && startsOnAMonday
        ? firstDay.day(-6)
        : firstDay.day(startsOnAMonday ? 1 : 0);
    const endOfThatWeek = startOfThatWeek.add(6, "days");
    const domID = dates2DOMID(startOfThatWeek, endOfThatWeek);
    const element = document.querySelector(`#${domID}`);
    // console.log({ domID, element });
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, [firstDay]);

  useEffect(() => {
    const startOfThatWeek =
      lastDay.day() === 0 && startsOnAMonday
        ? lastDay.day(-6)
        : lastDay.day(startsOnAMonday ? 1 : 0);
    const endOfThatWeek = startOfThatWeek.add(6, "days");
    const domID = dates2DOMID(startOfThatWeek, endOfThatWeek);
    const element = document.querySelector(`#${domID}`);
    // console.log({ domID, element });
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, [lastDay]);

  const startOfWeek =
    firstDay.day() === 0 && startsOnAMonday
      ? firstDay.day(-6)
      : firstDay.day(startsOnAMonday ? 1 : 0);
  const endOfWeek =
    firstDay.day() === 0 && startsOnAMonday
      ? lastDay.day(0)
      : lastDay.day(startsOnAMonday ? 7 : 6);

  const weeks: WeekDay[][] = [];
  let date = startOfWeek;
  let week: WeekDay[] = [];

  let guard = 0;
  while (date <= endOfWeek) {
    week.push({ date, meals: [] });
    if (week.length === 7) {
      // This technique might not work if we're only going to show
      // weekdays or only show weekends.
      weeks.push(week);
      week = [];
    }
    date = date.add(1, "day");
    guard++;
    if (guard > 100) break;
  }

  return (
    <div>
      {/* <form
        onSubmit={(event) => {
          event.preventDefault();
          console.log("SEARCH!");
        }}
      >
        <div class="mb-3">
          <input
            type="each"
            class="form-control"
            id="id_search"
            placeholder="Search..."
          />
        </div>
      </form> */}
      {/* <pre>
        {startOfWeek.format("YYYY-MM-DD")} -- {endOfWeek.format("YYYY-MM-DD")}
      </pre> */}
      {/* <div class="d-grid gap-2 d-md-block">
  <button class="btn btn-primary" type="button">Button</button>
  <button class="btn btn-primary" type="button">Button</button>
</div> */}
      <div class="d-grid gap-2 hide-in-print">
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          onClick={() => {
            setFirstDay(firstDay.subtract(7, "days"));
          }}
        >
          Previous week ↑
        </button>

        {firstDay.diff(dayjs(), "days") < 0 && (
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            onClick={() => {
              const today = dayjs();
              const startOfThisWeek =
                today.day() === 0 && startsOnAMonday
                  ? today.day(-6)
                  : today.day(startsOnAMonday ? 1 : 0);
              const endOfThisWeek = startOfThisWeek.add(6, "days");
              const domID = dates2DOMID(startOfThisWeek, endOfThisWeek);
              const element = document.querySelector(`#${domID}`);

              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            Go to today&apos;s week
          </button>
        )}
      </div>

      {weeks.map((weekdays) => {
        return (
          <div
            key={weekdays[0].date}
            class={style.week}
            id={dates2DOMID(
              weekdays[0].date,
              weekdays[weekdays.length - 1].date
            )}
          >
            <p class={`${style.week_heading} text-center`}>
              {weekdays[0].date.format("MMM D")} …{" "}
              {weekdays[weekdays.length - 1].date.format("MMM D")}
              <small style={{ float: "right" }} class="text-muted">
                {showWeekRelation(weekdays[0].date, startsOnAMonday)}
              </small>
            </p>
            {/* <code>
              {dates2DOMID(
                weekdays[0].date,
                weekdays[weekdays.length - 1].date
              )}
            </code> */}

            {weekdays.map((weekday) => {
              return <ShowWeekDay weekday={weekday} key={weekday.date} />;
            })}
          </div>
        );
      })}

      <div class="d-grid gap-2 hide-in-print">
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          onClick={() => {
            setLastDay(lastDay.add(7, "days"));
          }}
        >
          Next week ↓
        </button>

        {lastDay.diff(dayjs(), "days") > 0 && (
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            onClick={() => {
              const today = dayjs();
              const startOfThisWeek =
                today.day() === 0 && startsOnAMonday
                  ? today.day(-6)
                  : today.day(startsOnAMonday ? 1 : 0);
              const endOfThisWeek = startOfThisWeek.add(6, "days");
              const domID = dates2DOMID(startOfThisWeek, endOfThisWeek);
              const element = document.querySelector(`#${domID}`);
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            Go to today&apos;s week
          </button>
        )}
      </div>
    </div>
  );
}

function ShowWeekDay({ weekday }: { weekday: WeekDay }) {
  function showRelation(d: dayjs.Dayjs): string {
    if (d.isToday()) {
      return "today";
    }
    if (d.isTomorrow()) {
      return "tomorrow";
    }
    if (d.isYesterday()) {
      return "yesterday";
    }

    return d.fromNow();
  }

  const isPast = !weekday.date.isToday() && !dayjs().isBefore(weekday.date);
  return (
    <div class={`${style.weekday} ${isPast ? style.weekday_past : ""}`}>
      <p>
        <b>{weekday.date.format("dddd")}</b>{" "}
        <small class="text-muted">{weekday.date.format("D MMM")}</small>
        <small style={{ float: "right" }} class="text-muted">
          {showRelation(weekday.date)}
        </small>
        <br />
        Fish and crabs
      </p>
    </div>
  );
}
