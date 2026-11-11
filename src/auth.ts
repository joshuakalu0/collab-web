import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { ensurePersonalWorkspaceForUser, findUserByEmail, getPrismaClient, verifyPasswordHash } from "@booster/database";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(getPrismaClient()),
  callbacks: {
    async signIn({ user }) {
      if (user.id && user.email) {
        await ensurePersonalWorkspaceForUser({
          email: user.email,
          name: user.name ?? null,
          userId: user.id
        });
      }

      return true;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    }
  },
  events: {
    async createUser({ user }) {
      if (user.id && user.email) {
        await ensurePersonalWorkspaceForUser({
          email: user.email,
          name: user.name ?? null,
          userId: user.id
        });
      }
    }
  },
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const user = await findUserByEmail(parsed.data.email);

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await verifyPasswordHash(parsed.data.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          email: user.email,
          id: user.id,
          image: user.image,
          name: user.name
        };
      }
    }),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            allowDangerousEmailAccountLinking: true,
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET
          })
        ]
      : [])
  ],
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt"
  }
});
