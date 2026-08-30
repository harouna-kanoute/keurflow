import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/card";
import { Money } from "../../components/money";
import { minorUnitFor } from "../../lib/projectSummary";
import { useStyles, type Theme } from "../../theme";
import { AddFundingSheet } from "./add-funding-sheet";
import type { ProjectDetailState } from "./types";

const MAX_STAGGER_INDEX = 6;
const STAGGER_STEP_MS = 60;

export function FinancementsTab({
  state,
  projectId,
  onChanged,
  isBlocked,
}: {
  state: Extract<ProjectDetailState, { status: "ready" }>;
  projectId: string;
  onChanged: () => void;
  isBlocked: boolean;
}) {
  const styles = useStyles(createStyles);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { project, fundings, paymentMethods } = state;
  const minorUnit = minorUnitFor(project.currency_code);
  const methodLabel = (id: string) => paymentMethods.find((m) => m.id === id)?.label ?? "—";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Financements</Text>
        {!isBlocked && (
          <Pressable
            style={styles.addButton}
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Ajouter un financement"
          >
            <Ionicons name="add" size={18} color={styles.addButtonIcon.color} />
          </Pressable>
        )}
      </View>

      {fundings.length === 0 && <Text style={styles.empty}>Aucun financement enregistré.</Text>}

      {fundings.map((f, index) => (
        <Animated.View
          key={f.id}
          entering={FadeInUp.delay(Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS).duration(300)}
        >
          <Card style={styles.row}>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.rowText}>{methodLabel(f.payment_method_id)}</Text>
              {f.reference ? <Text style={styles.rowMeta}>{f.reference}</Text> : null}
              <Text style={styles.rowMeta}>{f.funding_date}</Text>
            </View>
            <Money amountMinor={f.amount_minor} currencyCode={f.currency_code} minorUnit={minorUnit} style={styles.rowAmount} />
          </Card>
        </Animated.View>
      ))}

      <AddFundingSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={onChanged}
        projectId={projectId}
        currencyCode={project.currency_code}
        minorUnit={minorUnit}
        paymentMethods={paymentMethods}
      />
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { gap: theme.spacing.md },
    header: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    title: { fontSize: 16, fontWeight: "700" as const, color: theme.colors.text },
    addButton: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    addButtonIcon: { color: theme.colors.primaryText },
    empty: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 12 },
    row: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      gap: theme.spacing.sm,
    },
    rowText: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
    rowMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    rowAmount: { fontSize: 14, fontWeight: "700" as const, color: theme.colors.text },
  };
}
