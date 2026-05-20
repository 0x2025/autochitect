"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { getContentLoader } from "./registry";

export function ContentLoader({ slug }: { slug: string }) {
  const Component = useMemo(() => {
    const loader = getContentLoader(slug);
    if (!loader) return null;
    return dynamic(loader, {
      ssr: false,
      loading: () => (
        <div style={{
          padding: "32px 0",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "12px",
          color: "var(--g500)",
        }}>
          Loading…
        </div>
      ),
    });
  }, [slug]);

  if (!Component) return null;
  return <Component />;
}
