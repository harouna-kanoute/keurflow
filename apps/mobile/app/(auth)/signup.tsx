import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@keurflow/validation";
import { COUNTRIES } from "@keurflow/config";
import { Link } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { FormInput } from "../../src/components/form-input";
import { SelectField } from "../../src/components/select-field";
import { PrimaryButton } from "../../src/components/primary-button";
import { supabase } from "../../src/lib/supabase";
import { useStyles, type Theme } from "../../src/theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

const COUNTRY_OPTIONS = COUNTRIES.filter((c) => c.active).map((c) => ({
  value: c.code,
  label: c.name,
}));

export default function SignupScreen() {
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const styles = useStyles(createStyles);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName, country_code: data.countryCode } },
    });
    setPending(false);
    if (error) {
      if (error.code === "over_email_send_rate_limit") {
        setRootError("Trop de tentatives. Réessayez dans quelques minutes.");
      } else if (error.message.toLowerCase().includes("already")) {
        setRootError("Un compte existe déjà avec cet email.");
      } else {
        setRootError(GENERIC_ERROR);
      }
      return;
    }
    setDone(true);
  });

  if (done) {
    return (
      <View style={styles.checkEmail}>
        <Text style={styles.title}>Vérifiez vos emails</Text>
        <Text style={styles.footerText}>
          Un lien de confirmation vient de vous être envoyé. Ouvrez-le pour activer votre compte,
          puis revenez vous connecter.
        </Text>
        <Link href="/login" style={styles.link}>
          Retour à la connexion
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>KEURFLOW</Text>
        <Text style={styles.title}>Créer un compte</Text>

        <View style={styles.form}>
          <FormInput
            control={control}
            name="fullName"
            label="Nom complet"
            autoComplete="name"
            error={errors.fullName?.message}
          />
          <FormInput
            control={control}
            name="email"
            label="Email"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email?.message}
          />
          <SelectField
            control={control}
            name="countryCode"
            label="Pays"
            options={COUNTRY_OPTIONS}
            error={errors.countryCode?.message}
          />
          <FormInput
            control={control}
            name="password"
            label="Mot de passe"
            secureTextEntry
            autoComplete="new-password"
            error={errors.password?.message}
          />
          <FormInput
            control={control}
            name="confirmPassword"
            label="Confirmer le mot de passe"
            secureTextEntry
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
          />
          {rootError && <Text style={styles.error}>{rootError}</Text>}
          <PrimaryButton onPress={onSubmit} pending={pending}>
            {pending ? "Création…" : "Créer mon compte"}
          </PrimaryButton>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ?</Text>
          <Link href="/login" style={styles.link}>
            Se connecter
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
    eyebrow: {
      fontSize: 12,
      fontWeight: "600" as const,
      letterSpacing: 1,
      color: theme.colors.textMuted,
      textAlign: "center" as const,
    },
    title: {
      fontSize: 24,
      fontWeight: "700" as const,
      color: theme.colors.text,
      textAlign: "center" as const,
      marginTop: 6,
      marginBottom: 32,
    },
    form: { gap: 16 },
    error: { fontSize: 13, color: theme.colors.danger },
    footer: { marginTop: 32, alignItems: "center" as const, gap: 6 },
    footerText: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center" as const },
    link: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text, textDecorationLine: "underline" as const },
    checkEmail: {
      flex: 1,
      justifyContent: "center" as const,
      paddingHorizontal: 24,
      gap: 12,
      backgroundColor: theme.colors.background,
    },
  };
}
