import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useStyles, type Theme } from "../theme";

// Same tone/copy as web's banner (dashboard-chrome.tsx) — kept in sync
// deliberately, this is the same feature on both platforms.
export function TrialLockedBanner() {
  const styles = useStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ⏳ Votre essai gratuit a fait son temps ! Vos chantiers vous attendent bien au chaud —
        passez à l&apos;abonnement pour reprendre la main.
      </Text>
      <Pressable onPress={() => router.push("/billing")}>
        <Text style={styles.link}>Voir les abonnements</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    container: {
      backgroundColor: theme.colors.amberBg,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 6,
    },
    text: { fontSize: 12, color: theme.colors.amber, lineHeight: 18 },
    link: { fontSize: 12, fontWeight: "700" as const, color: theme.colors.amber, textDecorationLine: "underline" as const },
  };
}
