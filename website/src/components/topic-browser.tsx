"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { TOPIC_GROUPS } from "@/lib/topics";
import type { PostData } from "@/lib/posts";

export function TopicBrowser({ posts }: { posts: PostData[] }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(TOPIC_GROUPS.map((g) => [g.id, true]))
  );

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside style={{
      width: "228px",
      flexShrink: 0,
      overflowY: "auto",
      borderRight: "1px solid var(--g300)",
      background: "var(--oat)",
      paddingBottom: "32px",
    }}>
      {TOPIC_GROUPS.map((group) => {
        const isOpen = openGroups[group.id] ?? true;

        return (
          <div key={group.id} style={{ borderBottom: "1px solid var(--g300)" }}>
            {/* Group header */}
            <div
              onClick={() => toggleGroup(group.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <span style={{
                display: "flex", alignItems: "center", gap: "8px",
                fontFamily: "var(--font-sans, ui-sans-serif, sans-serif)", fontSize: "10px", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: "var(--g500)",
              }}>
                <span style={{ fontSize: "13px" }}>{group.icon}</span>
                {group.label}
              </span>
              <span style={{
                fontSize: "11px", color: "var(--g500)",
                transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                transition: "transform 0.15s",
                display: "inline-block",
              }}>▾</span>
            </div>

            {/* Entries */}
            {isOpen && group.entries.map((entry) => {
              if (entry.articleSlug) {
                const href = `/articles/${entry.articleSlug}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={entry.id}
                    href={href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "7px 16px 7px 32px",
                      fontFamily: "var(--font-sans, ui-sans-serif, sans-serif)",
                      fontSize: "13px",
                      color: "var(--slate)",
                      textDecoration: "none",
                      background: isActive ? "rgba(217,119,87,0.12)" : "transparent",
                      borderRight: isActive ? "2px solid var(--clay)" : "2px solid transparent",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {entry.label}
                    <span style={{ fontSize: "10px", color: "var(--clay-text)" }}>→</span>
                  </Link>
                );
              }
              return (
                <span
                  key={entry.id}
                  style={{
                    display: "flex",
                    padding: "7px 16px 7px 32px",
                    fontFamily: "var(--font-sans, ui-sans-serif, sans-serif)",
                    fontSize: "13px",
                    color: "var(--g500)",
                  }}
                >
                  {entry.label}
                </span>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
