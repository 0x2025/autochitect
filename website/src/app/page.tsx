import Link from "next/link";
import { getSortedPostsData } from "@/lib/posts";
import { TOPIC_GROUPS } from "@/lib/topics";

export const metadata = {
  title: "autochitect | Software Architecture & Engineering",
  description: "A knowledge base for software architecture, system design, and engineering craft.",
};

export default function Home() {
  const posts = getSortedPostsData();
  const totalTopics = TOPIC_GROUPS.reduce((n, g) => n + g.entries.length, 0);
  const linkedTopics = TOPIC_GROUPS.reduce(
    (n, g) => n + g.entries.filter((e) => e.articleSlug).length,
    0
  );

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Center */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px", minWidth: 0 }}>
        <h2 className="section-heading">Recent Write-ups</h2>

        {posts.length > 0 ? (
          posts.map(({ slug, date, title, summary, tags }) => (
            <article key={slug} className="article-card">
              <h3 className="article-card-title">
                <Link href={`/articles/${slug}`}>{title}</Link>
              </h3>
              <div className="article-card-meta">
                <span>{date}</span>
                {tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <p className="article-card-summary">{summary}</p>
              <Link href={`/articles/${slug}`} className="read-more">
                Read write-up &rarr;
              </Link>
            </article>
          ))
        ) : (
          <p style={{ fontStyle: "italic", color: "var(--g500)" }}>No write-ups yet.</p>
        )}
      </main>

      {/* Right panel */}
      <aside style={{
        width: "272px",
        flexShrink: 0,
        overflowY: "auto",
        borderLeft: "1px solid var(--g300)",
        padding: "24px",
        background: "var(--oat)",
      }}>
        <div className="right-section">
          <p className="right-section-heading">Knowledge Map</p>
          <table className="props-table">
            <tbody>
              <tr><td>Domains</td><td>{TOPIC_GROUPS.length}</td></tr>
              <tr><td>Topics</td><td>{totalTopics}</td></tr>
              <tr><td>Write-ups</td><td>{posts.length}</td></tr>
              <tr><td>Covered</td><td>{linkedTopics} topics</td></tr>
            </tbody>
          </table>
        </div>

        <div className="right-section">
          <p className="right-section-heading">Domains</p>
          <ul className="related-list">
            {TOPIC_GROUPS.map((g) => (
              <li key={g.id} style={{ justifyContent: "space-between" }}>
                <span>
                  <span style={{ color: "var(--olive-dark)", marginRight: "6px" }}>{g.icon}</span>
                  {g.label}
                </span>
                <span style={{ fontSize: "10px", color: "var(--g500)" }}>{g.entries.length}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="right-section">
          <p className="right-section-heading">About</p>
          <p className="right-notes">
            A curated knowledge base on software architecture and system design.
            Select a topic from the left panel to explore write-ups.
          </p>
        </div>
      </aside>
    </div>
  );
}
