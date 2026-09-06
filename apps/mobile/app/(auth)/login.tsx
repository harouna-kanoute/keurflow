import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@keurflow/validation";
import { Link } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { FormInput } from "../../src/components/form-input";
import { KeurFlowMark } from "../../src/components/keurflow-mark";
import { PrimaryButton } from "../../src/components/primary-button";
import { supabase } from "../../src/lib/supabase";
import { useStyles, type Theme } from "../../src/theme";

// Generic fallback per §68 — real Supabase error details never reach the UI.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export default function LoginScreen() {
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const styles = useStyles(createStyles);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);
    // Same class of bug fixed in signup.tsx: an uncaught rejection here
    // (e.g. a network failure, not a returned `{ error }`) would leave the
    // button stuck on "Connexion…" forever with no feedback at all.
    try {
      const { error } = await supabase.auth.signInWithPassword(data);
      if (error) {
        // Don't blame the password for something that never reached the
        // server: status 0 / AuthRetryableFetchError is a connectivity
        // failure, and on mobile that is the common case, not the rare one.
        if (error.status === 0 || error.name === "AuthRetryableFetchError") {
          setRootError("Connexion au serveur impossible. Vérifiez votre connexion et réessayez.");
        } else if (error.status === 429 || error.code === "over_request_rate_limit") {
          setRootError("Trop de tentatives. Patientez quelques instants avant de réessayer.");
        } else if (error.code === "email_not_confirmed") {
          setRootError("Confirmez d'abord votre email — vérifiez votre boîte de réception.");
        } else {
          setRootError("Email ou mot de passe incorrect.");
        }
      }
      // On success, RootNavigation's auth-state listener handles the redirect.
    } catch (err) {
      console.error("[login] unexpected error:", err);
      setRootError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.markWrap}>
          <KeurFlowMark size={56} />
        </View>
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

function createStyles(theme: Theme) {
  return {
    flex: { flex: 1, backgroundColor: theme.colors.background },
    container: { flexGrow: 1, justifyContent: "center" as const, paddingHorizontal: 24, paddingVertical: 48 },
    markWrap: { alignItems: "center" as const },
    title: {
      fontSize: 24,
      fontWeight: "700" as const,
      color: theme.colors.text,
      textAlign: "center" as const,
      marginTop: 16,
      marginBottom: 32,
    },
    form: { gap: 16 },
    error: { fontSize: 13, color: theme.colors.danger },
    footer: { marginTop: 32, alignItems: "center" as const, gap: 6 },
    footerText: { fontSize: 14, color: theme.colors.textMuted },
    link: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text, textDecorationLine: "underline" as const },
  };
}
