"use client";

import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function ProvidersContent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="animate-pulse italic text-slate-400">Loading...</div>;
  }

  if (status === "authenticated") {
    return (
      <div className="space-y-2">
        <div className="italic font-serif truncate">{session.user?.name}</div>
        <button 
          onClick={() => signOut()}
          className="hover:underline font-bold uppercase tracking-tight text-slate-800"
        >
          [Sign Out]
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => signIn("github")}
      className="hover:underline font-bold uppercase tracking-tight text-slate-800"
    >
      [Sign In]
    </button>
  );
}
