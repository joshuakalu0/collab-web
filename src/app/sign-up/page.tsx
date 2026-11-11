import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CredentialsForm } from "@/components/credentials-form";
import { registerWithCredentials, signInWithGitHub } from "@/app/actions";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-aside">
        <p className="eyebrow">Create access</p>
        <h1>Join the workspace, create documents, and invite other existing users into live rooms.</h1>
        <p>
          This build is workspace-first: members belong to teams, documents inherit workspace boundaries, and
          owners can layer view or edit access on top of that foundation.
        </p>
        <ul className="feature-list">
          <li>Strong-password local registration</li>
          <li>GitHub sign-up for social bootstrap</li>
          <li>Shared Postgres + Redis collaboration stack</li>
        </ul>
      </section>
      <section className="auth-main">
        <CredentialsForm
          action={registerWithCredentials}
          footerHref="/sign-in"
          footerLabel="Sign in"
          footerText="Already have an account?"
          heading="Create your account"
          mode="sign-up"
          pendingLabel="Creating your account..."
          submitLabel="Create account"
          supportingCopy="Your account can own documents, collaborate on shared ones, and mint secure socket access when you open a room."
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
