import { getDb, upsertUserByEmail } from "@cogwork/db";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Auth.js (NextAuth v5). Phase 0 uses a credential-free dev login (email only,
 * no password) plus JWT sessions, so login works with zero external creds. The
 * Google OAuth provider is wired at go-live (Phase 3). COGWORK_CONTEXT.md §5.2.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "email",
      name: "Email",
      credentials: { email: { label: "Email", type: "email" } },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "")
          .trim()
          .toLowerCase();
        if (!email || !email.includes("@")) return null;
        const user = await upsertUserByEmail(getDb(), email, { name: email.split("@")[0]! });
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      const uid = (token as { uid?: string }).uid;
      if (session.user && typeof uid === "string") {
        (session.user as { id?: string }).id = uid;
      }
      return session;
    },
  },
});

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

/** Resolve the signed-in user, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as { id?: string; email?: string; name?: string } | undefined;
  if (!u?.id) return null;
  return { id: u.id, email: u.email ?? "", name: u.name ?? "" };
}
