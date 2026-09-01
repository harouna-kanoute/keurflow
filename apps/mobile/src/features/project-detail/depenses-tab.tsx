import { EXPENSE_CATEGORIES } from "@keurflow/config";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../../components/badge";
import { Card } from "../../components/card";
import { Money } from "../../components/money";
import { minorUnitFor } from "../../lib/projectSummary";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../theme";
import { AddExpenseSheet } from "./add-expense-sheet";
import { EXPENSE_STATUS_LABELS, EXPENSE_TONES } from "./status-labels";
import type { ProjectDetailState } from "./types";

const CATEGORY_LABELS = new Map(EXPENSE_CATEGORIES.map((c) => [c.code, c.label]));
const MAX_STAGGER_INDEX = 6;
const STAGGER_STEP_MS = 60;

export function DepensesTab({
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
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { project, expenses } = state;
  const minorUnit = minorUnitFor(project.currency_code);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dépenses récentes</Text>
        {!isBlocked && (
          <Pressable
            style={styles.addButton}
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une dépense"
          >
            <Ionicons name="add" size={18} color={styles.addButtonIcon.color} />
          </Pressable>
        )}
      </View>

      {expenses.length === 0 && <Text style={styles.empty}>Aucune dépense.</Text>}

      {expenses.map((e, index) => (
        <Animated.View
          key={e.id}
          entering={entranceAnimation(theme.reducedMotion, {
            index,
            maxStaggerIndex: MAX_STAGGER_INDEX,
            stepMs: STAGGER_STEP_MS,
            duration: 300,
          })}
        >
          <Card style={styles.row}>
            <View style={{ flexShrink: 1, gap: 4 }}>
              <Text style={styles.rowText}>
                {CATEGORY_LABELS.get(e.category) ?? e.category}
                {e.supplier_name ? ` · ${e.supplier_name}` : ""}
              </Text>
              <Badge label={EXPENSE_STATUS_LABELS[e.status] ?? e.status} tone={EXPENSE_TONES[e.status] ?? "neutral"} />
            </View>
            <Money amountMinor={e.amount_minor} currencyCode={e.currency_code} minorUnit={minorUnit} style={styles.rowAmount} />
          </Card>
        </Animated.View>
      ))}

      <AddExpenseSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={onChanged}
        projectId={projectId}
        currencyCode={project.currency_code}
        minorUnit={minorUnit}
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
    rowAmount: { fontSize: 14, fontWeight: "700" as const, color: theme.colors.text },
  };
}
