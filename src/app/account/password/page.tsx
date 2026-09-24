import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthCard } from "@/components/AuthCard";
import { ChangePasswordForm } from "@/components/AuthForms";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <AuthCard
      title={user.mustChangePassword ? `Welcome, ${user.name}` : "Change password"}
      text={user.mustChangePassword ? "Choose your own password to finish signing in. Only you will know it." : undefined}
    >
      <ChangePasswordForm />
      {!user.mustChangePassword && (
        <Link href="/" className="block text-center text-[11.5px] underline mt-4" style={{ color: "var(--text-secondary)" }}>
          Back to the dashboard
        </Link>
      )}
    </AuthCard>
  );
}
