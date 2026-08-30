import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getStoredDisplayCurrency,
  setStoredDisplayCurrency,
  type DisplayCurrency,
} from "./display-currency";

type DisplayCurrencyContextValue = {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (value: DisplayCurrency) => void;
};

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

// React Context instead of web's window CustomEvent bus (lib/display-currency.ts) —
// mobile has no equivalent DOM event target, and every <Money> instance
// already needs to re-render on change regardless, so a context is the more
// idiomatic React Native fit.
export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>("native");

  useEffect(() => {
    getStoredDisplayCurrency().then(setDisplayCurrencyState);
  }, []);

  const setDisplayCurrency = (value: DisplayCurrency) => {
    setDisplayCurrencyState(value);
    setStoredDisplayCurrency(value);
  };

  return (
    <DisplayCurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency }}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) throw new Error("useDisplayCurrency must be used within a DisplayCurrencyProvider");
  return ctx;
}
