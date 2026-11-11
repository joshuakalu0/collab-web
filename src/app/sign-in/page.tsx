import Link from "next/link";
import { redirect } from "next/navigation";

import { signInWithCredentials, signInWithGitHub } from "@/app/actions";
import { auth } from "@/auth";
import { CredentialsForm } from "@/components/credentials-form";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-aside">
        <p className="eyebrow">Secure entry</p>
        <h1>Sign in to a document room that actually has presence, permissions, and shared state behind it.</h1>
        <p>The web UI uses Auth.js sessions, while the socket service receives a short-lived signed token scoped to the document you open.</p>
        <ul className="feature-list">
          <li>Credentials login for local accounts</li>
          <li>GitHub OAuth for quicker teammate onboarding</li>
          <li>JWT-backed socket handoff instead of cookie scraping</li>
        </ul>
      </section>
      <section className="auth-main">
        <CredentialsForm
          action={signInWithCredentials}
          footerHref="/sign-up"
          footerLabel="Create one"
          footerText="Need an account?"
          heading="Sign in"
          mode="sign-in"
          pendingLabel="Signing you in..."
          submitLabel="Sign in"
          supportingCopy="Use your workspace credentials to get back into the shared editor."
        />
        <form action={signInWithGitHub} className="oauth-form">
          <button className="ghost-button" type="submit">
            Continue with GitHub
          </button>
        </form>
        <p className="helper-copy auth-backlink">
          <Link href="/">Back to the project overview</Link>
        </p>
      </section>
    </main>
  );
}
