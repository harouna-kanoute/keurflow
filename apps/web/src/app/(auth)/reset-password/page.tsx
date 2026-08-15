import { ResetPasswordForm } from "./reset-password-form";

// Reached via the recovery email link, or via the invite-acceptance flow
// (?invite=1 — see verifyEmailOtp), after /auth/callback exchanges the code
// and establishes a temporary session — never linked to directly.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return <ResetPasswordForm invite={invite === "1"} />;
}
