"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import type { AuthFormState } from "@/app/actions";

type CredentialsFormProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  footerHref: string;
  footerLabel: string;
  footerText: string;
  heading: string;
  mode: "sign-in" | "sign-up";
  pendingLabel: string;
  submitLabel: string;
  supportingCopy: string;
};

const emptyState: AuthFormState = {
  error: null
};

export function CredentialsForm({
  action,
  footerHref,
  footerLabel,
  footerText,
  heading,
  mode,
  pendingLabel,
  submitLabel,
  supportingCopy
}: CredentialsFormProps) {
  const [state, formAction] = useActionState(action, emptyState);

  return (
    <div className="auth-card">
      <div className="auth-card-copy">
        <p className="eyebrow">Realtime workspace</p>
        <h1>{heading}</h1>
        <p>{supportingCopy}</p>
      </div>
      <form action={formAction} className="auth-form">
        {mode === "sign-up" ? (
          <label className="field">
            <span>Name</span>
            <input autoComplete="name" name="name" placeholder="Ada Lovelace" required type="text" />
          </label>
        ) : null}
        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            name="email"
            placeholder="you@team.com"
            required
            type="email"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            name="password"
            placeholder={mode === "sign-up" ? "Create a strong password" : "Enter your password"}
            required
            type="password"
          />
        </label>
        {state.error ? <p className="form-error">{state.error}</p> : null}
        <SubmitButton className="primary-button" label={submitLabel} pendingLabel={pendingLabel} />
      </form>
      <p className="auth-footer">
        {footerText} <Link href={footerHref}>{footerLabel}</Link>
      </p>
    </div>
  );
}
