import { getPostData, getSortedPostsData, type RightPanelSection } from "@/lib/posts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasContent } from "../content/registry";
import { ContentLoader } from "../content/content-loader";

function RightSection({ section }: { section: RightPanelSection }) {
  if (section.type === "properties") {
    return (
      <div style={{ marginBottom: "28px" }}>
        {section.title && (
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--clay-text)",
            margin: "0 0 10px",
            borderBottom: "1.5px solid var(--clay)",
            paddingBottom: "5px",
          }}>
            {section.title}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {section.items.map((prop) => (
            <div key={prop.label} style={{
              display: "grid",
              gridTemplateColumns: "40% 1fr",
              gap: "8px",
              padding: "7px 0",
              borderBottom: "1px solid var(--g300)",
            }}>
              <span style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "10px",
                color: "var(--g500)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                paddingTop: "1px",
              }}>
                {prop.label}
              </span>
              <span style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "11px",
                color: "var(--slate)",
                fontWeight: 600,
                lineHeight: 1.4,
              }}>
                {prop.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === "notes") {
    return (
      <div style={{ marginBottom: "28px" }}>
        {section.title && (
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--clay-text)",
            margin: "0 0 10px",
            borderBottom: "1.5px solid var(--clay)",
            paddingBottom: "5px",
          }}>
            {section.title}
          </p>
        )}
        <div style={{
          padding: "10px 12px",
          background: "var(--oat)",
          borderLeft: "3px solid var(--clay)",
          borderRadius: "0 4px 4px 0",
        }}>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "12px",
            color: "var(--slate)",
            lineHeight: 1.65,
            margin: 0,
          }}>
            {section.content}
          </p>
        </div>
      </div>
    );
  }

  if (section.type === "list") {
    return (
      <div style={{ marginBottom: "28px" }}>
        {section.title && (
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--clay-text)",
            margin: "0 0 10px",
            borderBottom: "1.5px solid var(--clay)",
            paddingBottom: "5px",
          }}>
            {section.title}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {section.items.map((item) => (
            <div key={item} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 0",
              borderBottom: "1px solid var(--g300)",
            }}>
              <span style={{ color: "var(--clay)", fontSize: "7px", flexShrink: 0 }}>◆</span>
              <span style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "12px",
                color: "var(--slate)",
              }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export async function generateStaticParams() {
  const posts = getSortedPostsData();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const post = await getPostData(slug);

    const useRichContent = hasContent(slug);

    return (
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Center: article */}
        <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px", minWidth: 0 }}>
          <article>
            {/* Article header */}
            <header style={{
              borderBottom: "2px solid var(--slate)",
              paddingBottom: "20px",
              marginBottom: "36px",
            }}>
              <h1 style={{
                fontFamily: "var(--font-serif, Georgia, serif)",
                fontSize: "30px",
                fontWeight: 700,
                color: "var(--slate)",
                margin: "0 0 14px",
                lineHeight: 1.2,
              }}>
                {post.title}
              </h1>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}>
                <span style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "11px",
                  color: "var(--sky-text)",
                  letterSpacing: "0.05em",
                }}>
                  {post.date}
                </span>
                {post.tags.map((tag) => (
                  <span key={tag} style={{
                    display: "inline-block",
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--white)",
                    background: "var(--olive-dark)",
                    padding: "2px 7px",
                    borderRadius: "2px",
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
              {post.summary && (
                <p style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "14px",
                  color: "var(--g500)",
                  margin: "14px 0 0",
                  lineHeight: 1.65,
                  fontStyle: "italic",
                }}>
                  {post.summary}
                </p>
              )}
            </header>

            {/* Content — rich HTML or markdown fallback */}
            {useRichContent ? (
              <ContentLoader slug={slug} />
            ) : (
              <div
                className="prose"
                dangerouslySetInnerHTML={{ __html: post.contentHtml || "" }}
              />
            )}

            <footer style={{
              marginTop: "48px",
              paddingTop: "20px",
              borderTop: "1px solid var(--g300)",
            }}>
              <Link href="/" style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--clay-text)",
                textDecoration: "none",
              }}>
                &larr; Back to Home
              </Link>
            </footer>
          </article>
        </main>

        {/* Right: concept panel */}
        <aside style={{
          width: "272px",
          flexShrink: 0,
          overflowY: "auto",
          borderLeft: "1px solid var(--g300)",
          padding: "24px",
          background: "var(--oat)",
        }}>
          {post.sections && post.sections.filter((s) => s.type !== "properties").length > 0 ? (
            post.sections
              .filter((s) => s.type !== "properties")
              .map((section, i) => (
                <RightSection key={i} section={section} />
              ))
          ) : (
            <p style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px",
              color: "var(--g500)",
              fontStyle: "italic",
            }}>
              No concept details for this post.
            </p>
          )}
        </aside>
      </div>
    );
  } catch {
    notFound();
  }
}
