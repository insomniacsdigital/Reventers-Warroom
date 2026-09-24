import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthCard } from "@/components/AuthCard";
import { SignInForm } from "@/components/AuthForms";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/account/password" : "/");
  return (
    <AuthCard title="Sign in" text="Use the name or email and the password an admin gave you.">
      <SignInForm />
    </AuthCard>
  );
}
