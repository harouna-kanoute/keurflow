import {
  Geist_100Thin,
  Geist_200ExtraLight,
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
  Geist_900Black,
} from "@expo-google-fonts/geist";
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold } from "@expo-google-fonts/lora";
import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/lib/auth-context";
import { DisplayCurrencyProvider } from "../src/lib/display-currency-context";
import { ThemeProvider, useStyles, useTheme, type Theme } from "../src/theme";

function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles(createStyles);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/welcome");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  // Both font choices ("Moderne"/"Classique") need their files loaded up
  // front — the choice itself is only known once ThemeProvider reads it from
  // AsyncStorage, which happens *after* this, so there's no way to load just
  // the active one. "Système" needs nothing (native OS font).
  const [fontsLoaded] = useFonts({
    Geist_100Thin,
    Geist_200ExtraLight,
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
    Geist_900Black,
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#08090d" }}>
        <ActivityIndicator color="#6c5cd9" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DisplayCurrencyProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedStatusBar />
            <AuthProvider>
              <RootNavigation />
            </AuthProvider>
          </GestureHandlerRootView>
        </DisplayCurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

function createStyles(theme: Theme) {
  return {
    loading: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: theme.colors.background,
    },
  };
}
