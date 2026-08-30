import { Stack } from "expo-router";
import { useTheme } from "../../src/theme";

export default function AppLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTintColor: theme.colors.text,
        headerTitleStyle: { color: theme.colors.text },
      }}
    >
      {/* No native header here — the screen renders its own hero banner. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="projects/[id]" options={{ title: "" }} />
    </Stack>
  );
}
