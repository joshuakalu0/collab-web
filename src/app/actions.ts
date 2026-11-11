"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { signInFormSchema, signUpFormSchema } from "@/lib/forms";
import { requireViewerSession } from "@/lib/session";
import { createDocumentSchema } from "@booster/collab-contracts";
import {
  createDocumentForOwner,
  createDocumentInWorkspace,
  createPasswordHash,
  createUserWithPassword,
  findUserByEmail,
  getWorkspaceForUser
} from "@booster/database";

export type AuthFormState = {
  error: string | null;
};

export async function signInWithCredentials(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signInFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      error: "Enter a valid email and password."
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "The email or password did not match an existing account."
      };
    }

    throw error;
  }

  return {
    error: null
  };
}

export async function signInWithGitHub() {
  await signIn("github", {
    redirectTo: "/"
  });
}

export async function registerWithCredentials(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signUpFormSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues.at(0)?.message ?? "Complete every field with a strong password."
    };
  }

  const existingUser = await findUserByEmail(parsed.data.email);

  if (existingUser) {
    return {
      error: "That email already has an account. Sign in instead."
    };
  }

  const passwordHash = await createPasswordHash(parsed.data.password);

  await createUserWithPassword({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Your account was created, but the sign-in handoff failed. Try signing in manually."
      };
    }

    throw error;
  }

  return {
    error: null
  };
}

export async function createDocumentAction(formData: FormData) {
  const session = await requireViewerSession();
  const parsed = createDocumentSchema.safeParse({
    title: formData.get("title") || "Untitled document"
  });

  if (!parsed.success) {
    redirect("/docs/new?error=title");
  }

  const document = await createDocumentForOwner({
    ownerId: session.user.id,
    title: parsed.data.title
  });

  if (!document) {
    redirect("/?error=create-document");
  }

  redirect(`/docs/${document.id}`);
}

export async function createWorkspaceDocumentAction(workspaceSlug: string, formData: FormData) {
  const session = await requireViewerSession();
  const parsed = createDocumentSchema.safeParse({
    title: formData.get("title") || "Untitled document"
  });

  if (!parsed.success) {
    redirect(`/w/${workspaceSlug}/docs/new?error=title`);
  }

  const workspace = await getWorkspaceForUser({
    slug: workspaceSlug,
    userId: session.user.id
  });

  if (!workspace) {
    redirect("/");
  }

  const document = await createDocumentInWorkspace({
    title: parsed.data.title,
    userId: session.user.id,
    workspaceId: workspace.id
  });

  if (!document) {
    redirect(`/w/${workspaceSlug}?error=create-document`);
  }

  redirect(`/docs/${document.id}`);
}

export async function signOutAction() {
  await signOut({
    redirectTo: "/"
  });
}
