import { getPostData, getSortedPostsData, type RightPanelSection } from "@/lib/posts";
import Link from "next/link";
import { notFound } from "next/navigation";

function RightSection({ section }: { section: RightPanelSection }) {
  return (
    <div className="right-section">
      {section.title && <p className="right-section-heading">{section.title}</p>}

      {section.type === "properties" && (
        <table className="props-table">
          <tbody>
            {section.items.map((prop) => (
              <tr key={prop.label}>
                <td>{prop.label}</td>
                <td>{prop.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {section.type === "notes" && (
        <p className="right-notes">{section.content}</p>
      )}

      {section.type === "list" && (
        <ul className="related-list">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function generateStaticParams() {
  const posts = getSortedPostsData();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const post = await getPostData(slug);

    return (
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Center: article */}
        <main style={{ flex: 1, overflowY: "auto", padding: "32px", minWidth: 0 }}>
          <article>
            <header className="article-header">
              <h1 className="article-title">{post.title}</h1>
              <div className="article-meta">
                <span>{post.date}</span>
                {post.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </header>

            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: post.contentHtml || "" }}
            />

            <footer style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid var(--g300)" }}>
              <Link href="/" className="read-more">&larr; Back to Home</Link>
            </footer>
          </article>
        </main>

        {/* Right: dynamic sections from frontmatter */}
        <aside style={{
          width: "272px",
          flexShrink: 0,
          overflowY: "auto",
          borderLeft: "1px solid var(--g300)",
          padding: "24px",
          background: "var(--oat)",
        }}>
          {post.sections && post.sections.length > 0
            ? post.sections.map((section, i) => (
                <RightSection key={i} section={section} />
              ))
            : (
              <p style={{ fontFamily: "var(--font-sans, ui-sans-serif, sans-serif)", fontSize: "12px", color: "var(--g500)", fontStyle: "italic" }}>
                No concept details for this post.
              </p>
            )
          }
        </aside>
      </div>
    );
  } catch {
    notFound();
  }
}
