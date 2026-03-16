import Link from "next/link";
import { getSortedPostsData } from "@/lib/posts";

export const metadata = {
  title: "Autonomous Architect | Home",
  description: "Latest articles on software architecture, code, and AI.",
};

export default function Home() {
  const allPostsData = getSortedPostsData();

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-bold border-b-2 border-slate-800 pb-1 mb-6">Recent Articles</h2>
        <div className="space-y-12">
          {allPostsData.length > 0 ? (
            allPostsData.map(({ slug, date, title, summary, tags }) => (
              <article key={slug} className="lwn-article">
                <header>
                  <h3 className="lwn-article-title m-0">
                    <Link href={`/posts/${slug}`} className="hover:underline">
                      {title}
                    </Link>
                  </h3>
                  <div className="lwn-article-meta text-[11px] text-slate-500 font-sans uppercase mb-2">
                    {date} | Tags: {tags.join(", ")}
                  </div>
                </header>
                <div className="text-sm leading-relaxed text-slate-800">
                  {summary}
                </div>
                <div className="mt-2 text-[11px]">
                  <Link href={`/posts/${slug}`} className="font-bold uppercase hover:underline text-slate-900">
                    Continue reading &raquo;
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <p className="italic text-slate-500">No articles found yet. Check back soon.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold border-b-2 border-slate-800 pb-1 mb-4">Latest Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-serif">
          <div className="bg-[#f8f8f0] border border-[#ccc] p-4 h-full flex flex-col">
            <h4 className="m-0 font-sans font-bold mb-1 uppercase tracking-tight text-xs">Architecture Scan</h4>
            <p className="m-0 mb-4 flex-grow italic text-slate-700">Autonomous tool for deep repository analysis and architectural validation.</p>
            <Link href="/tools/architecture-scan" className="font-sans font-bold text-[11px] uppercase hover:underline">Launch Tool &raquo;</Link>
          </div>
          <div className="bg-[#f8f8f0] border border-[#ccc] p-4 h-full flex flex-col">
            <h4 className="m-0 font-sans font-bold mb-1 uppercase tracking-tight text-xs">Sumvela Engine</h4>
            <p className="m-0 mb-4 flex-grow italic text-slate-700">High-performance .NET calculation engine for complex formulas and business logic.</p>
            <a href="https://sumvela.com" target="_blank" rel="noopener noreferrer" className="font-sans font-bold text-[11px] uppercase hover:underline">Visit Sumvela &raquo;</a>
          </div>
        </div>
      </section>
    </div>
  );
}
