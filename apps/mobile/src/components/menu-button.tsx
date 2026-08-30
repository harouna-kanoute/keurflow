import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { useDrawer } from "../lib/drawer-context";
import { useTheme } from "../theme";

export function MenuButton() {
  const { open } = useDrawer();
  const theme = useTheme();

  return (
    <Pressable
      onPress={open}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir le menu"
      style={{ paddingHorizontal: 12 }}
    >
      <Ionicons name="menu-outline" size={24} color={theme.colors.text} />
    </Pressable>
  );
}
