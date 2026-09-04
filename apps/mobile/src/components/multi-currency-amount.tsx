import { convertDisplayAmountMinor, formatMoney, getCurrencyMinorUnit } from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import { Text, type TextProps } from "react-native";
import { useDisplayCurrency } from "../lib/display-currency-context";

function nativeMinorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

// Direct port of the web app's MultiCurrencyAmount — same two modes: once a
// display-currency preference is set (Money uses the same one) and every
// entry converts cleanly, shows one combined total in that currency;
// otherwise (native, or an entry that can't convert) falls back to the
// native per-currency breakdown ("18 000 € + 500 000 F CFA"). Was
// previously always-native only, which visibly disagreed with the
// per-project Money amounts right below it once a display currency was set.
export function MultiCurrencyAmount({
  totals,
  style,
}: {
  totals: Record<string, number>;
  style?: TextProps["style"];
}) {
  const { displayCurrency } = useDisplayCurrency();
  const entries = Object.entries(totals);
  const wantsConversion = displayCurrency !== "native";

  if (entries.length === 0) {
    const currency = wantsConversion ? displayCurrency : "EUR";
    return <Text style={style}>{formatMoney(0, currency, getCurrencyMinorUnit(currency))}</Text>;
  }

  if (wantsConversion) {
    const converted = entries.map(([code, amt]) => convertDisplayAmountMinor(amt, code, displayCurrency));
    if (converted.every((v): v is number => v !== null)) {
      const totalMinor = converted.reduce((sum, v) => sum + v, 0);
      return (
        <Text style={style}>{formatMoney(totalMinor, displayCurrency, getCurrencyMinorUnit(displayCurrency))}</Text>
      );
    }
  }

  return (
    <Text style={style}>
      {entries
        .map(([currencyCode, amountMinor]) => formatMoney(amountMinor, currencyCode, nativeMinorUnitFor(currencyCode)))
        .join(" + ")}
    </Text>
  );
}
