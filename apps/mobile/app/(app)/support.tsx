import { zodResolver } from "@hookform/resolvers/zod";
import { createSupportTicketSchema, type CreateSupportTicketInput } from "@keurflow/validation";
import { SUPPORT_TICKET_CATEGORIES } from "@keurflow/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Badge } from "../../src/components/badge";
import { Card } from "../../src/components/card";
import { FormInput } from "../../src/components/form-input";
import { PrimaryButton } from "../../src/components/primary-button";
import { SelectField } from "../../src/components/select-field";
import { useOrgMembership } from "../../src/features/navigation/use-org-membership";
import { supabase } from "../../src/lib/supabase";
import { useStyles, useTheme, type Theme } from "../../src/theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

// Local-only label maps, same pattern as web's own support/page.tsx — no
// export from packages/* for the labels themselves (only the enum value
// arrays, which are imported below).
const CATEGORY_LABELS: Record<string, string> = { bug: "Bug", security: "Faille de sécurité", other: "Autre" };
const CATEGORY_OPTIONS = SUPPORT_TICKET_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Fermé",
};
const STATUS_TONES: Record<string, "neutral" | "amber" | "success" | "brand"> = {
  open: "amber",
  in_progress: "brand",
  resolved: "success",
  closed: "neutral",
};

type Ticket = {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
};

// No attachment picker on mobile (web allows up to 4 images per ticket) and
// no reply/thread feature exists on web either — tickets are one-shot,
// triaged manually, per the migration's own comment.
export default function SupportScreen() {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const { membership } = useOrgMembership();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSupportTicketInput>({
    resolver: zodResolver(createSupportTicketSchema),
    defaultValues: { category: "bug", subject: "", description: "" },
  });

  const loadTickets = useCallback(async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("id, category, subject, description, status, created_at")
      .order("created_at", { ascending: false });
    setTickets(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [loadTickets]),
  );

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);

    // RLS (support_tickets_insert_own) is the authoritative check.
    const { error } = await supabase.from("support_tickets").insert({
      category: data.category,
      subject: data.subject,
      description: data.description,
      organization_id: membership?.organizationId ?? null,
    });

    setPending(false);
    if (error) {
      setRootError(GENERIC_ERROR);
      return;
    }

    reset({ category: "bug", subject: "", description: "" });
    loadTickets();
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        Un bug, une faille de sécurité ou tout autre problème ? Décrivez-le ci-dessous, nous
        l'examinerons dès que possible.
      </Text>

      <Card style={styles.formCard}>
        <SelectField control={control} name="category" label="Catégorie" options={CATEGORY_OPTIONS} />
        <FormInput control={control} name="subject" label="Sujet" error={errors.subject?.message} />
        <FormInput
          control={control}
          name="description"
          label="Description"
          error={errors.description?.message}
          multiline
          numberOfLines={5}
          style={styles.descriptionInput}
        />
        {rootError && <Text style={styles.error}>{rootError}</Text>}
        <PrimaryButton onPress={onSubmit} pending={pending}>
          {pending ? "Envoi…" : "Envoyer"}
        </PrimaryButton>
      </Card>

      <View style={styles.securityNote}>
        <Text style={styles.securityNoteText}>
          <Text style={{ fontWeight: "700" }}>Faille de sécurité ? </Text>
          Merci de ne pas la divulguer publiquement tant qu'elle n'a pas été corrigée — décrivez-la
          ici, en évitant d'inclure des données personnelles d'un autre utilisateur.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Mes signalements</Text>
      {tickets === null && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 12 }} />}
      {tickets?.length === 0 && <Text style={styles.empty}>Aucun signalement pour le moment.</Text>}
      {tickets?.map((ticket) => (
        <Card key={ticket.id} style={styles.ticketCard}>
          <View style={styles.ticketTop}>
            <Text style={styles.ticketSubject} numberOfLines={1}>
              {ticket.subject}
            </Text>
            <View style={styles.ticketBadges}>
              <Badge label={CATEGORY_LABELS[ticket.category] ?? ticket.category} tone="neutral" />
              <Badge
                label={STATUS_LABELS[ticket.status] ?? ticket.status}
                tone={STATUS_TONES[ticket.status] ?? "neutral"}
              />
            </View>
          </View>
          <Text style={styles.ticketDescription}>{ticket.description}</Text>
          <Text style={styles.ticketDate}>
            {new Date(ticket.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    intro: { fontSize: 13, color: theme.colors.textMuted },
    formCard: { gap: theme.spacing.md },
    descriptionInput: { height: 110, textAlignVertical: "top" as const },
    error: { fontSize: 13, color: theme.colors.danger },
    securityNote: {
      backgroundColor: theme.colors.amberBg,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    securityNoteText: { fontSize: 12, color: theme.colors.amber, lineHeight: 18 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.5,
      textTransform: "uppercase" as const,
      color: theme.colors.textMuted,
    },
    empty: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 4 },
    ticketCard: { gap: theme.spacing.sm },
    ticketTop: { gap: theme.spacing.sm },
    ticketSubject: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
    ticketBadges: { flexDirection: "row" as const, gap: 6 },
    ticketDescription: { fontSize: 13, color: theme.colors.textMuted },
    ticketDate: { fontSize: 11, color: theme.colors.textMuted },
  };
}
