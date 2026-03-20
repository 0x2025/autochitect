import type { Metadata } from "next";
import "./globals.css";
import { Providers, ProvidersContent } from "./providers";
import Link from "next/link";

export const metadata: Metadata = {
  title: "autochitect.com | Autonomous Architecture, Code, AI",
  description: "Autonomous Architecture: Random thoughts on software architecture, code, and the AI era.",
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="lwn-container">
            <header className="lwn-header">
              <p className="text-sm font-sans tracking-tight text-slate-500 uppercase">
                Autonomous Architecture: Random thoughts on software architecture, code, and the AI era
              </p>
            </header>
            <div className="flex flex-col md:flex-row">
              <aside className="lwn-sidebar">
                <section className="mb-6">
                  <h3 className="text-sm font-bold uppercase mt-0 mb-2 border-b border-black">Menu</h3>
                  <ul className="list-none p-0 m-0 space-y-1">
                    <li><Link href="/" className="hover:bg-[#d0d0c0]">Home</Link></li>
                    <li><Link href="/archives" className="hover:bg-[#d0d0c0]">Archives</Link></li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h3 className="text-sm font-bold uppercase mt-4 mb-2 border-b border-black">Products</h3>
                  <ul className="list-none p-0 m-0 space-y-1">
                    <li><Link href="/tools/architecture-scan" className="hover:bg-[#d0d0c0]">Architecture Scan</Link></li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-sm font-bold uppercase mt-4 mb-2 border-b border-black">Focus</h3>
                  <p className="text-[13px] leading-relaxed">
                    My software products and random thoughts. AI is not going to replace software engineer. It is going to shift us to be more architect and system design.
                  </p>
                </section>
                <section className="mt-8 pt-4 border-t border-black">
                  <h3 className="text-sm font-bold uppercase mb-2 border-b border-black">Account</h3>
                  <div className="text-[13px]">
                    <ProvidersContent />
                  </div>
                </section>
              </aside>
              <main className="lwn-main-column">
                <div className="lwn-content">
                  {children}
                </div>
              </main>
            </div>
            <footer className="border-t border-slate-300 p-4 text-[12px] text-center font-sans text-slate-400">
              &copy; 2026 autochitect.com by <a href="https://www.linkedin.com/in/sangcu/" target="_blank" rel="noopener noreferrer" className="hover:underline">Sang</a>
              <br />
              Build and maintain by Open SWE
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
