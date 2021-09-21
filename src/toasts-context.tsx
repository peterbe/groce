import { h, createContext } from "preact";
import { useState, useContext } from "preact/hooks";

interface Toast {
  id: number;
  header: string;
  body?: string;
  sticky: boolean;
  isError: boolean;
  date: Date;
}

type NewToast = Omit<Toast, "id" | "date">;

type Context = {
  toasts: Toast[];
  addToast: (params: string | Partial<NewToast>) => void;
  closeToast: (id: number) => void;
};

const Toasts = createContext<Context | null>(null);

let _nextID = 0;
function getNextID() {
  return _nextID++;
}

export function ToastsProvider(props: {
  children: h.JSX.Element[] | h.JSX.Element;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(header: string | Partial<NewToast>) {
    if (typeof header !== "string" && !header.header) {
      throw new Error("Must have a .header if passed an object");
    }

    const newToast: Toast = {
      id: getNextID(),
      date: new Date(),
      header: typeof header === "string" ? header : header.header || "",
      body: typeof header === "string" ? "" : header.body || "",
      sticky: typeof header === "string" ? false : header.sticky || false,
      isError: typeof header === "string" ? false : header.sticky || false,
    };
    setToasts((prevState) => [newToast, ...prevState]);
  }
  const context = {
    toasts,
    addToast,
    closeToast: (id: number) => {
      setToasts((prevState) => prevState.filter((t) => t.id !== id));
    },
  };
  return <Toasts.Provider value={context}>{props.children}</Toasts.Provider>;
}

export function useToasts() {
  const value = useContext(Toasts);
  return (
    value || {
      toasts: [],
      addToast: () => ({}),
      closeToast: () => ({}),
    }
  );
}
