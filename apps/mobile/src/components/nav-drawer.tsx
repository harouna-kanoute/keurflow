import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeurFlowMark } from "./keurflow-mark";
import { useOrgMembership } from "../features/navigation/use-org-membership";
import { supabase } from "../lib/supabase";
import { useDrawer } from "../lib/drawer-context";
import { useStyles, type Theme } from "../theme";

const DRAWER_WIDTH = 280;

type NavHref = "/" | "/notifications" | "/billing" | "/profile" | "/audit-log" | "/support";
type NavItem = { label: string; href: NavHref; icon: keyof typeof Ionicons.glyphMap };

const GENERAL_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/", icon: "home-outline" },
  { label: "Notifications", href: "/notifications", icon: "notifications-outline" },
  { label: "Abonnement", href: "/billing", icon: "card-outline" },
];

// Reproduces web's own translate-x-0/-translate-x-full + overlay drawer
// technique (dashboard-chrome.tsx) with Reanimated instead of CSS classes —
// same 2-group nav (Général / Compte), same "Journal d'activité" gate
// (shown whenever the user has an active org membership, not just admins —
// the destination screen itself enforces the admin-only gate, matching web).
export function NavDrawer() {
  const { isOpen, close } = useDrawer();
  const { membership } = useOrgMembership();
  const insets = useSafeAreaInsets();
  const styles = useStyles(createStyles);
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(isOpen ? 0 : -DRAWER_WIDTH, { duration: 250 });
    backdropOpacity.value = withTiming(isOpen ? 1 : 0, { duration: 200 });
  }, [isOpen, translateX, backdropOpacity]);

  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const go = (href: NavHref) => {
    close();
    router.push(href);
  };

  const accountItems: NavItem[] = [
    { label: "Mon profil", href: "/profile", icon: "person-outline" },
    ...(membership
      ? [{ label: "Journal d'activité", href: "/audit-log", icon: "time-outline" } as NavItem]
      : []),
    { label: "Support", href: "/support", icon: "help-buoy-outline" },
  ];

  return (
    <>
      <Animated.View pointerEvents={isOpen ? "auto" : "none"} style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropPress} onPress={close} />
      </Animated.View>

      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[styles.drawer, drawerStyle, { paddingTop: insets.top + 16 }]}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brandRow}>
            <KeurFlowMark size={28} />
            <Text style={styles.brand}>KeurFlow</Text>
          </View>

          <Text style={styles.groupLabel}>Général</Text>
          {GENERAL_ITEMS.map((item) => (
            <Pressable key={item.href} style={styles.item} onPress={() => go(item.href)}>
              <Ionicons name={item.icon} size={20} color={styles.itemIcon.color} />
              <Text style={styles.itemLabel}>{item.label}</Text>
            </Pressable>
          ))}

          <Text style={styles.groupLabel}>Compte</Text>
          {accountItems.map((item) => (
            <Pressable key={item.href} style={styles.item} onPress={() => go(item.href)}>
              <Ionicons name={item.icon} size={20} color={styles.itemIcon.color} />
              <Text style={styles.itemLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={styles.signOut}
          onPress={() => {
            close();
            supabase.auth.signOut();
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={styles.signOutText.color} />
          <Text style={styles.signOutText}>Déconnexion</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

function createStyles(theme: Theme) {
  return {
    backdrop: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      zIndex: 10,
    },
    backdropPress: { flex: 1 },
    drawer: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: theme.colors.card,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      zIndex: 20,
      paddingBottom: 16,
    },
    content: { paddingHorizontal: theme.spacing.lg, gap: 2 },
    brandRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    brand: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: theme.colors.text,
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.5,
      textTransform: "uppercase" as const,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.md,
      marginBottom: 4,
    },
    item: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: theme.spacing.sm + 2,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: theme.radius.sm,
    },
    itemIcon: { color: theme.colors.textMuted },
    itemLabel: { fontSize: 14, fontWeight: "500" as const, color: theme.colors.text },
    signOut: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: theme.spacing.sm + 2,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.lg + 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: theme.spacing.sm,
    },
    signOutText: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.danger },
  };
}
