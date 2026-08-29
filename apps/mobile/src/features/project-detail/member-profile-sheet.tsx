import { Image, Linking, Text, View } from "react-native";
import { PrimaryButton } from "../../components/primary-button";
import { SheetModal } from "../../components/sheet-modal";
import { useStyles, type Theme } from "../../theme";
import { PROJECT_ROLE_LABELS } from "./status-labels";
import type { Member } from "./types";

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function MemberProfileSheet({
  visible,
  onClose,
  member,
}: {
  visible: boolean;
  onClose: () => void;
  member: Member | null;
}) {
  const styles = useStyles(createStyles);
  if (!member) return null;

  const digits = member.phone?.replace(/\D/g, "");

  return (
    <SheetModal visible={visible} onClose={onClose} title="Profil">
      <View style={styles.header}>
        {member.avatarSignedUrl ? (
          <Image source={{ uri: member.avatarSignedUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{initialsFor(member.fullName)}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.name}>
            {member.fullName}
            {member.status === "invited" ? " (invité·e)" : ""}
          </Text>
          <Text style={styles.role}>{PROJECT_ROLE_LABELS[member.role] ?? member.role}</Text>
        </View>
      </View>

      {digits ? (
        <PrimaryButton onPress={() => Linking.openURL(`https://wa.me/${digits}`)}>
          Contacter sur WhatsApp
        </PrimaryButton>
      ) : (
        <Text style={styles.empty}>Aucun numéro WhatsApp renseigné</Text>
      )}
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    header: { flexDirection: "row" as const, alignItems: "center" as const, gap: theme.spacing.md },
    avatar: { width: 56, height: 56, borderRadius: theme.radius.full },
    avatarFallback: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.brand[100],
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarFallbackText: { fontSize: 18, fontWeight: "700" as const, color: theme.colors.brand[700] },
    headerText: { gap: 2, flexShrink: 1 },
    name: { fontSize: 16, fontWeight: "700" as const, color: theme.colors.text },
    role: { fontSize: 13, color: theme.colors.textMuted },
    empty: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" as const },
  };
}
