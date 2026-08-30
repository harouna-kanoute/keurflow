import { Stack } from "expo-router";
import { View } from "react-native";
import { MenuButton } from "../../src/components/menu-button";
import { NavDrawer } from "../../src/components/nav-drawer";
import { DrawerProvider } from "../../src/lib/drawer-context";
import { useTheme } from "../../src/theme";

export default function AppLayout() {
  const theme = useTheme();

  return (
    <DrawerProvider>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.background },
            headerShadowVisible: false,
            headerTintColor: theme.colors.text,
            headerTitleStyle: { color: theme.colors.text },
            headerRight: () => <MenuButton />,
          }}
        >
          {/* No native header here — the screen renders its own hero banner
              (with its own menu button) and hides the header entirely. */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
          <Stack.Screen name="projects/[id]" options={{ title: "" }} />
          <Stack.Screen name="billing" options={{ title: "Abonnement" }} />
          <Stack.Screen name="profile" options={{ title: "Mon profil" }} />
          <Stack.Screen name="support" options={{ title: "Support" }} />
          <Stack.Screen name="audit-log" options={{ title: "Journal d'activité" }} />
        </Stack>
        <NavDrawer />
      </View>
    </DrawerProvider>
  );
}
