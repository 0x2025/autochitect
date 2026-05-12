import type { Metadata } from "next";
import "./globals.css";
import { Inter, Lora, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import Link from "next/link";
import { TopicBrowser } from "@/components/topic-browser";
import { getSortedPostsData } from "@/lib/posts";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "autochitect | Software Architecture & Engineering",
  description: "A knowledge base for software architecture, system design, and engineering craft.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const posts = getSortedPostsData();

  return (
    <html lang="en" style={{ height: "100%" }} className={`${inter.variable} ${lora.variable} ${jetbrainsMono.variable}`}>
      <body style={{ height: "100%", margin: 0 }}>
        <Providers>
          {/* Full-viewport explorer shell */}
          <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* ── Top bar ─────────────────────────────────────────── */}
            <header style={{
              flexShrink: 0,
              height: "56px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              background: "var(--white)",
              borderBottom: "1px solid var(--g300)",
              zIndex: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "8px",
                  background: "var(--clay)", color: "var(--white)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-serif, Georgia, serif)", fontWeight: 700, fontSize: "18px", flexShrink: 0,
                }}>A</div>
                <div>
                  <p style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: "20px", fontWeight: 700, color: "var(--slate)", margin: 0, lineHeight: 1 }}>
                    autochitect
                  </p>
                  <p style={{ fontFamily: "var(--font-sans, ui-sans-serif, sans-serif)", fontSize: "11px", fontStyle: "italic", color: "var(--clay-text)", margin: "2px 0 0", lineHeight: 1 }}>
                    Explore software architecture ◆
                  </p>
                </div>
              </div>

              <nav>
                <ul style={{ display: "flex", alignItems: "center", gap: "32px", listStyle: "none", margin: 0, padding: 0 }}>
                  {[
                    { href: "/", icon: "⊞", label: "Home" },
                    { href: "/archives", icon: "☰", label: "Archives" },
                  ].map(({ href, icon, label }) => (
                    <li key={href}>
                      <Link href={href} className="topbar-nav-link">
                        <span style={{ fontSize: "18px", lineHeight: 1 }}>{icon}</span>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </header>

            {/* ── Body: left + content ─────────────────────────────── */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <TopicBrowser posts={posts} />

              {/* Center + right content (each page fills this) */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "var(--white)" }}>
                {children}
              </div>
            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            <footer style={{
              flexShrink: 0,
              borderTop: "1px solid var(--g300)",
              padding: "10px 24px",
              textAlign: "center",
              fontFamily: "var(--font-sans, ui-sans-serif, sans-serif)",
              fontSize: "11px",
              color: "var(--g500)",
              background: "var(--white)",
            }}>
              &copy; 2026 autochitect.com &mdash; by{" "}
              <a href="https://www.linkedin.com/in/sangcu/" target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--g500)" }}>Sang</a>
              {" "}&middot;{" "}Built and maintained by Open SWE
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
