import { formatMoney } from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import { Text, type TextProps } from "react-native";

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

// Simplified port of the web app's MultiCurrencyAmount — always renders the
// native per-currency breakdown ("18 000 € + 500 000 F CFA") rather than
// also offering the single-display-currency conversion mode, which is a
// per-user preference mobile doesn't have a settings surface for yet.
export function MultiCurrencyAmount({
  totals,
  style,
}: {
  totals: Record<string, number>;
  style?: TextProps["style"];
}) {
  const entries = Object.entries(totals);

  if (entries.length === 0) {
    return <Text style={style}>{formatMoney(0, "EUR", 2)}</Text>;
  }

  return (
    <Text style={style}>
      {entries
        .map(([currencyCode, amountMinor]) => formatMoney(amountMinor, currencyCode, minorUnitFor(currencyCode)))
        .join(" + ")}
    </Text>
  );
}
