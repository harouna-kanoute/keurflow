import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@keurflow/validation";
import { Link } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { FormInput } from "../../src/components/form-input";
import { PrimaryButton } from "../../src/components/primary-button";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/theme";

// Generic fallback per §68 — real Supabase error details never reach the UI.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export default function LoginScreen() {
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);
    const { error } = await supabase.auth.signInWithPassword(data);
    setPending(false);
    if (error) {
      setRootError("Email ou mot de passe incorrect.");
    }
    // On success, RootNavigation's auth-state listener handles the redirect.
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>KEURFLOW</Text>
        <Text style={styles.title}>Se connecter</Text>

        <View style={styles.form}>
          <FormInput
            control={control}
            name="email"
            label="Email"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email?.message}
          />
          <FormInput
            control={control}
            name="password"
            label="Mot de passe"
            secureTextEntry
            autoComplete="current-password"
            error={errors.password?.message}
          />
          {rootError && <Text style={styles.error}>{rootError}</Text>}
          <PrimaryButton onPress={onSubmit} pending={pending}>
            {pending ? "Connexion…" : "Se connecter"}
          </PrimaryButton>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <Link href="/signup" style={styles.link}>
            Créer un compte
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: colors.textMuted,
    textAlign: "center",
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginTop: 6, marginBottom: 32 },
  form: { gap: 16 },
  error: { fontSize: 13, color: colors.danger },
  footer: { marginTop: 32, alignItems: "center", gap: 6 },
  footerText: { fontSize: 14, color: colors.textMuted },
  link: { fontSize: 14, fontWeight: "600", color: colors.text, textDecorationLine: "underline" },
});
