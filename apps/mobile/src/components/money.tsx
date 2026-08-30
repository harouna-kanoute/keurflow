import { convertDisplayAmountMinor, formatMoney, getCurrencyMinorUnit } from "@keurflow/business";
import { Text, type TextProps } from "react-native";
import { useDisplayCurrency } from "../lib/display-currency-context";

// Direct port of apps/web/src/components/money.tsx — drop-in replacement for
// a plain {formatMoney(amountMinor, currencyCode, minorUnit)} call, renders
// in the user's preferred display currency when one is set and convertible,
// otherwise falls back to the amount's own native currency.
export function Money({
  amountMinor,
  currencyCode,
  minorUnit,
  style,
}: {
  amountMinor: number;
  currencyCode: string;
  minorUnit: number;
  style?: TextProps["style"];
}) {
  const { displayCurrency } = useDisplayCurrency();

  if (displayCurrency === "native") {
    return <Text style={style}>{formatMoney(amountMinor, currencyCode, minorUnit)}</Text>;
  }

  const converted = convertDisplayAmountMinor(amountMinor, currencyCode, displayCurrency);
  if (converted === null) {
    return <Text style={style}>{formatMoney(amountMinor, currencyCode, minorUnit)}</Text>;
  }

  return (
    <Text style={style}>
      {formatMoney(converted, displayCurrency, getCurrencyMinorUnit(displayCurrency))}
    </Text>
  );
}
