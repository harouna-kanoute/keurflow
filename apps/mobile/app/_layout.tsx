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
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/lib/auth-context";
import { DisplayCurrencyProvider } from "../src/lib/display-currency-context";
import { ThemeProvider, useTheme } from "../src/theme";

// Must run in global scope, not in an effect — by the time a component mounts
// the splash may already have auto-hidden, which is what left the first launch
// showing a bare white screen followed by two spinner flashes.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/welcome");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, loading, segments, router]);

  // Hide on layout rather than in an effect: this fires once the first real
  // frame is measured, so the splash never lifts onto an empty screen.
  const onLayout = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  // The splash stays up for both waits — fonts (RootLayout) and the session
  // lookup here — so there is one branded screen instead of a white flash, a
  // dark flash, then a themed spinner.
  if (loading) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  // Both font choices ("Moderne"/"Classique") need their files loaded up
  // front — the choice itself is only known once ThemeProvider reads it from
  // AsyncStorage, which happens *after* this, so there's no way to load just
  // the active one. "Système" needs nothing (native OS font).
  const [fontsLoaded, fontError] = useFonts({
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

  // null, not a spinner: the native splash is still up and covers this. Carry
  // on when the fonts fail rather than waiting forever — the splash only lifts
  // once this renders, so hanging here would strand the user on it. The theme's
  // "Système" option is a working fallback.
  if (!fontsLoaded && !fontError) return null;

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
