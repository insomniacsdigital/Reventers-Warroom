"use client";

import { useActionState } from "react";
import { signIn, changePassword, type ActionResult } from "@/lib/actions";
import { inputStyle, primaryButtonStyle } from "@/components/ui";

function Field({ label, name, type = "text", autoComplete }: { label: string; name: string; type?: string; autoComplete?: string }) {
  return (
    <label className="block mb-3">
      <span className="block text-[11px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <input name={name} type={type} autoComplete={autoComplete} required className="h-10 w-full rounded-lg border px-3 text-[13px]" style={inputStyle} />
    </label>
  );
}

function ErrorText({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="text-[11.5px] mb-3" style={{ color: "var(--status-critical)" }}>
      {state.error}
    </p>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action}>
      <Field label="Name or email" name="login" autoComplete="username" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="h-10 w-full rounded-lg text-[13px] font-bold" style={{ ...primaryButtonStyle, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action}>
      <Field label="New password (8+ characters)" name="password" type="password" autoComplete="new-password" />
      <Field label="Type it again" name="confirm" type="password" autoComplete="new-password" />
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="h-10 w-full rounded-lg text-[13px] font-bold" style={{ ...primaryButtonStyle, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
