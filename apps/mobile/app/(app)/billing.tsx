import { getTrialDaysRemaining, hasOrgRoleAtLeast } from "@keurflow/business";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import { Badge } from "../../src/components/badge";
import { Card } from "../../src/components/card";
import { Money } from "../../src/components/money";
import { PrimaryButton } from "../../src/components/primary-button";
import { useOrgMembership } from "../../src/features/navigation/use-org-membership";
import { minorUnitFor } from "../../src/lib/projectSummary";
import { supabase } from "../../src/lib/supabase";
import { useStyles, useTheme, type Theme } from "../../src/theme";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://web-keurflow.vercel.app";

// Same wording as web's billing-plan-cards.tsx STATUS_LABELS — local-only
// duplicate there too, nothing exported from packages/* for it.
const STATUS_LABELS: Record<string, string> = {
  trialing: "Essai en cours",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  incomplete: "Incomplet",
};

const STATUS_TONES: Record<string, "neutral" | "amber" | "success" | "danger"> = {
  trialing: "amber",
  active: "success",
  past_due: "danger",
  canceled: "neutral",
  incomplete: "neutral",
};

const PERIOD_LABELS: Record<string, string> = { month: "mois", year: "an" };

type Subscription = {
  plan_code: string;
  status: string;
  billing_period: string;
  currency_code: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
};
type Plan = { code: string; label: string; price_minor: number };

type State =
  | { status: "loading" }
  | { status: "no-org" }
  | { status: "no-subscription" }
  | {
      status: "ready";
      subscription: Subscription;
      plan: Plan;
      displayPriceMinor: number;
      canManageBilling: boolean;
    };

// Read-only — the actual checkout/portal actions are Next.js Server Actions
// holding the Stripe secret key (billing/actions.ts), unreachable from
// mobile. "Gérer l'abonnement" deep-links out to the web app instead of
// attempting a native Stripe flow.
export default function BillingScreen() {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const { membership, loading: membershipLoading } = useOrgMembership();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    if (membershipLoading) return;
    if (!membership) {
      setState({ status: "no-org" });
      return;
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_code, status, billing_period, currency_code, trial_ends_at, current_period_end")
      .eq("organization_id", membership.organizationId)
      .maybeSingle();

    if (!subscription) {
      setState({ status: "no-subscription" });
      return;
    }

    const { data: plan } = await supabase
      .from("plans")
      .select("code, label, price_minor")
      .eq("code", subscription.plan_code)
      .maybeSingle();

    if (!plan) {
      setState({ status: "no-subscription" });
      return;
    }

    // individual_trial is itself priced at 0 — show what it converts to
    // after the trial, same fallback web's billing page uses.
    let displayPriceMinor = plan.price_minor;
    if (plan.price_minor === 0) {
      const { data: paidIndividualPlan } = await supabase
        .from("plans")
        .select("price_minor")
        .eq("code", "individual")
        .maybeSingle();
      displayPriceMinor = paidIndividualPlan?.price_minor ?? 0;
    }

    setState({
      status: "ready",
      subscription,
      plan,
      displayPriceMinor,
      canManageBilling: hasOrgRoleAtLeast(membership.role, "admin"),
    });
  }, [membership, membershipLoading]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (state.status === "no-org") {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Aucune organisation associée à votre compte pour l'instant.</Text>
      </View>
    );
  }

  if (state.status === "no-subscription") {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Aucun abonnement trouvé pour cette organisation.</Text>
      </View>
    );
  }

  const { subscription, plan, displayPriceMinor, canManageBilling } = state;
  const minorUnit = minorUnitFor(subscription.currency_code);
  const trialDaysRemaining = getTrialDaysRemaining(subscription.trial_ends_at);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.planLabel}>{plan.label}</Text>
          <Badge
            label={STATUS_LABELS[subscription.status] ?? subscription.status}
            tone={STATUS_TONES[subscription.status] ?? "neutral"}
          />
        </View>

        {displayPriceMinor > 0 && (
          <Text style={styles.price}>
            <Money amountMinor={displayPriceMinor} currencyCode={subscription.currency_code} minorUnit={minorUnit} />
            <Text style={styles.pricePeriod}>
              {" "}
              / {PERIOD_LABELS[subscription.billing_period] ?? subscription.billing_period}
            </Text>
          </Text>
        )}

        <View style={styles.detailList}>
          {subscription.status === "trialing" && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Essai</Text>
              <Text style={styles.detailValue}>
                {trialDaysRemaining > 0
                  ? `${trialDaysRemaining} jour${trialDaysRemaining > 1 ? "s" : ""} restant${trialDaysRemaining > 1 ? "s" : ""}`
                  : "Terminé"}
              </Text>
            </View>
          )}
          {subscription.current_period_end && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Renouvellement</Text>
              <Text style={styles.detailValue}>
                {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
              </Text>
            </View>
          )}
        </View>

        {canManageBilling && (
          <View style={styles.buttonWrap}>
            <PrimaryButton onPress={() => Linking.openURL(`${WEB_URL}/dashboard/billing`)}>
              Gérer l'abonnement
            </PrimaryButton>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { padding: theme.spacing.lg },
    center: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: 24,
    },
    empty: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center" as const },
    headerRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    planLabel: { fontSize: 18, fontWeight: "700" as const, color: theme.colors.text },
    price: { fontSize: 22, fontWeight: "700" as const, color: theme.colors.text, marginTop: theme.spacing.md },
    pricePeriod: { fontSize: 14, fontWeight: "400" as const, color: theme.colors.textMuted },
    detailList: { marginTop: theme.spacing.lg, gap: theme.spacing.sm },
    detailRow: { flexDirection: "row" as const, justifyContent: "space-between" as const },
    detailLabel: { fontSize: 13, color: theme.colors.textMuted },
    detailValue: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text },
    buttonWrap: { marginTop: theme.spacing.lg },
  };
}
