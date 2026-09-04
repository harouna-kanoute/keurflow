import { EXPENSE_CATEGORIES } from "@keurflow/config";
import { formatMoney } from "@keurflow/business";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../../components/badge";
import { Card } from "../../components/card";
import { Money } from "../../components/money";
import { minorUnitFor } from "../../lib/projectSummary";
import { supabase } from "../../lib/supabase";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../theme";
import { AddExpenseSheet } from "./add-expense-sheet";
import { EXPENSE_STATUS_LABELS, EXPENSE_TONES } from "./status-labels";
import type { Expense, ProjectDetailState } from "./types";

// Same fallback as billing.tsx/profile.tsx — keurflow.com stays outside
// Vercel Deployment Protection, the .vercel.app default domain doesn't.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://keurflow.com";

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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);
  const { project, expenses, canApprove } = state;
  const minorUnit = minorUnitFor(project.currency_code);
  const projectUrl = `${WEB_URL}/dashboard/projects/${projectId}`;

  // RLS (expenses_update_own_pending_or_managers) is the authoritative
  // check — canApprove only gates whether the buttons are shown.
  const setStatus = async (expenseId: string, status: "approved" | "rejected" | "needs_information") => {
    setPendingId(expenseId);
    const { error } = await supabase.from("expenses").update({ status }).eq("id", expenseId);
    if (error) console.error("[updateExpenseStatus] Supabase error:", error.code, error.message);
    setPendingId(null);
    onChanged();
  };

  // Opens WhatsApp with a prefilled message, same as web's requestInfo — a
  // plain wa.me link, not the WhatsApp Business API. Unlike web's
  // window.open (which just silently no-ops if blocked), a failed/absent
  // deep link on mobile is otherwise invisible to the user, so both the
  // "no phone on file" and the "couldn't open WhatsApp" cases surface an
  // explicit message instead of only changing the status silently.
  const requestInfo = async (e: Expense) => {
    setWaError(null);
    if (!e.submitterPhone) {
      setWaError("Aucun numéro WhatsApp renseigné pour l'auteur de cette dépense.");
    } else {
      const digits = e.submitterPhone.replace(/\D/g, "");
      const greeting = e.submitterName ? `Bonjour ${e.submitterName},` : "Bonjour,";
      const categoryLabel = CATEGORY_LABELS.get(e.category) ?? e.category;
      const amountLabel = formatMoney(e.amount_minor, e.currency_code, minorUnitFor(e.currency_code));
      const details = `${categoryLabel}${e.supplier_name ? ` (${e.supplier_name})` : ""} — ${amountLabel}`;
      const message = `${greeting} une information complémentaire est nécessaire sur la dépense "${details}" sur KeurFlow. Merci de la compléter ou d'ajouter un justificatif : ${projectUrl}`;
      try {
        await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
      } catch {
        setWaError("Impossible d'ouvrir WhatsApp sur cet appareil.");
      }
    }
    setStatus(e.id, "needs_information");
  };

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

      {waError && <Text style={styles.waError}>{waError}</Text>}

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
          <Card style={styles.cardStack}>
            <View style={styles.row}>
              <View style={{ flexShrink: 1, gap: 4 }}>
                <Text style={styles.rowText}>
                  {CATEGORY_LABELS.get(e.category) ?? e.category}
                  {e.supplier_name ? ` · ${e.supplier_name}` : ""}
                </Text>
                <Badge label={EXPENSE_STATUS_LABELS[e.status] ?? e.status} tone={EXPENSE_TONES[e.status] ?? "neutral"} />
              </View>
              <Money amountMinor={e.amount_minor} currencyCode={e.currency_code} minorUnit={minorUnit} style={styles.rowAmount} />
            </View>

            {canApprove && (
              <View style={styles.actions}>
                <Pressable
                  disabled={pendingId === e.id}
                  onPress={() => setStatus(e.id, "approved")}
                  style={[styles.actionButton, styles.approveButton]}
                >
                  <Text style={[styles.actionLabel, styles.approveLabel]}>Approuver</Text>
                </Pressable>
                <Pressable
                  disabled={pendingId === e.id}
                  onPress={() => requestInfo(e)}
                  style={[styles.actionButton, styles.infoButton]}
                >
                  <Text style={styles.actionLabel}>Demander des infos</Text>
                </Pressable>
                <Pressable
                  disabled={pendingId === e.id}
                  onPress={() => setStatus(e.id, "rejected")}
                  style={[styles.actionButton, styles.rejectButton]}
                >
                  <Text style={[styles.actionLabel, styles.rejectLabel]}>Rejeter</Text>
                </Pressable>
              </View>
            )}
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
    waError: { fontSize: 12, color: theme.colors.danger },
    cardStack: { gap: theme.spacing.sm },
    row: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      gap: theme.spacing.sm,
    },
    rowText: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
    rowAmount: { fontSize: 14, fontWeight: "700" as const, color: theme.colors.text },
    actions: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: theme.spacing.sm },
    actionButton: {
      borderWidth: 1,
      borderRadius: theme.radius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    actionLabel: { fontSize: 12, fontWeight: "600" as const, color: theme.colors.text },
    approveButton: { borderColor: theme.colors.success },
    approveLabel: { color: theme.colors.success },
    infoButton: { borderColor: theme.colors.border },
    rejectButton: { borderColor: theme.colors.danger },
    rejectLabel: { color: theme.colors.danger },
  };
}
