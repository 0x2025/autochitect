import Link from "next/link";
import { getSortedPostsData } from "@/lib/posts";
import { TOPIC_GROUPS } from "@/lib/topics";

export const metadata = {
  title: "Archives | autochitect",
  description: "All write-ups on software architecture, system design, and engineering craft.",
};

export default function Archives() {
  const posts = getSortedPostsData();

  const grouped = posts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(post);
    return acc;
  }, {} as Record<number, typeof posts>);

  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  const covered = TOPIC_GROUPS.reduce(
    (n, g) => n + g.entries.filter((e) => e.articleSlug).length,
    0
  );

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Center */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px", minWidth: 0 }}>
        <h2 className="section-heading">All Write-ups</h2>

        {years.length > 0 ? (
          years.map((year) => (
            <section key={year} style={{ marginBottom: "48px" }}>
              <h3 className="archive-year">{year}</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {grouped[year].map(({ slug, date, title, summary, tags }) => (
                  <li key={slug} className="archive-entry">
                    <span className="archive-date">
                      {new Date(date).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                    </span>
                    <div>
                      <div className="archive-title">
                        <Link href={`/articles/${slug}`}>{title}</Link>
                        {tags.slice(0, 2).map((t) => (
                          <span key={t} className="tag" style={{ marginLeft: "8px" }}>{t}</span>
                        ))}
                      </div>
                      {summary && <p className="archive-summary">{summary}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p style={{ fontStyle: "italic", color: "var(--g500)" }}>No write-ups yet.</p>
        )}

        <footer style={{ paddingTop: "24px", borderTop: "1px solid var(--g300)" }}>
          <Link href="/" className="read-more">&larr; Back to Home</Link>
        </footer>
      </main>

      {/* Right */}
      <aside style={{
        width: "272px",
        flexShrink: 0,
        overflowY: "auto",
        borderLeft: "1px solid var(--g300)",
        padding: "24px",
        background: "var(--oat)",
      }}>
        <div className="right-section">
          <p className="right-section-heading">Stats</p>
          <table className="props-table">
            <tbody>
              <tr><td>Write-ups</td><td>{posts.length}</td></tr>
              <tr><td>Topics covered</td><td>{covered}</td></tr>
              <tr><td>Domains</td><td>{TOPIC_GROUPS.length}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="right-section">
          <p className="right-section-heading">By Domain</p>
          <ul className="related-list">
            {TOPIC_GROUPS.map((g) => {
              const count = posts.filter((p) =>
                g.entries.some((e) => e.articleSlug && p.slug === e.articleSlug)
              ).length;
              return (
                <li key={g.id} style={{ justifyContent: "space-between" }}>
                  <span>
                    <span style={{ color: "var(--olive-dark)", marginRight: "6px" }}>{g.icon}</span>
                    {g.label}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--g500)" }}>
                    {count} post{count !== 1 ? "s" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
