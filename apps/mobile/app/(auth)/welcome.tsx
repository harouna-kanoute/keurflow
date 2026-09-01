import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { KeurFlowMark } from "../../src/components/keurflow-mark";
import { PrimaryButton } from "../../src/components/primary-button";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../src/theme";

const VALUE_PROPS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "wallet-outline", text: "Suivi budgétaire en temps réel" },
  { icon: "receipt-outline", text: "Une preuve pour chaque dépense" },
  { icon: "flag-outline", text: "Étapes de chantier suivies" },
];

export default function WelcomeScreen() {
  const theme = useTheme();
  const styles = useStyles(createStyles);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LinearGradient
        colors={[theme.colors.brand[600], theme.colors.brand[900]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Animated.View
          entering={entranceAnimation(theme.reducedMotion, { direction: "down", duration: 400 })}
          style={styles.markWrap}
        >
          <KeurFlowMark size={48} />
        </Animated.View>

        <Animated.View
          entering={entranceAnimation(theme.reducedMotion, { direction: "down", delay: 60, duration: 500 })}
        >
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>Pensé pour la diaspora africaine</Text>
          </View>
        </Animated.View>

        <Animated.Text
          entering={entranceAnimation(theme.reducedMotion, { direction: "down", delay: 90, duration: 500 })}
          style={styles.title}
        >
          Votre projet en Afrique. Votre visibilité, où que vous soyez.
        </Animated.Text>

        <Animated.View
          entering={entranceAnimation(theme.reducedMotion, { direction: "down", delay: 180, duration: 500 })}
          style={styles.propsList}
        >
          {VALUE_PROPS.map((item) => (
            <View key={item.text} style={styles.propRow}>
              <View style={styles.propIcon}>
                <Ionicons name={item.icon} size={16} color="#ffffff" />
              </View>
              <Text style={styles.propText}>{item.text}</Text>
            </View>
          ))}
        </Animated.View>
      </LinearGradient>

      <Animated.View
        entering={entranceAnimation(theme.reducedMotion, { direction: "down", delay: 270, duration: 500 })}
        style={styles.actions}
      >
        <PrimaryButton size="lg" onPress={() => router.push("/signup")}>
          Commencer gratuitement
        </PrimaryButton>
        <PrimaryButton size="lg" variant="secondary" onPress={() => router.push("/login")}>
          Se connecter
        </PrimaryButton>
        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.trustText}>Données privées et sécurisées</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { flex: 1, backgroundColor: theme.colors.background },
    hero: {
      flex: 1,
      justifyContent: "center" as const,
      paddingHorizontal: theme.spacing.xxl,
      borderBottomLeftRadius: theme.radius.lg,
      borderBottomRightRadius: theme.radius.lg,
    },
    markWrap: { marginBottom: theme.spacing.lg },
    eyebrow: {
      alignSelf: "flex-start" as const,
      backgroundColor: theme.colors.overlayOnPrimary,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    eyebrowText: { fontSize: 12, fontWeight: "600" as const, color: "#ffffff" },
    title: {
      ...theme.typography.hero,
      color: "#ffffff",
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    propsList: { gap: theme.spacing.md },
    propRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: theme.spacing.md },
    propIcon: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.overlayOnPrimary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    propText: { ...theme.typography.body, color: "#ffffff" },
    actions: { padding: theme.spacing.xxl, gap: theme.spacing.md },
    trustRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      marginTop: theme.spacing.xs,
    },
    trustText: { fontSize: 12, color: theme.colors.textMuted },
  };
}
