import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "read:user user:email repo",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account?.access_token) {
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({ session, token }: any) {
            session.accessToken = token.accessToken;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
});
