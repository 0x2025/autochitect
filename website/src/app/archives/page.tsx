import Link from "next/link";
import { getSortedPostsData } from "@/lib/posts";

export const metadata = {
  title: "Archives | autochitect.com",
  description: "A comprehensive list of all articles on software architecture, code, and random thoughts.",
};

export default function Archives() {
  const allPostsData = getSortedPostsData();

  // Group posts by year
  const groupedPosts = allPostsData.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(post);
    return acc;
  }, {} as Record<number, typeof allPostsData>);

  const years = Object.keys(groupedPosts).map(Number).sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold border-b-2 border-slate-800 pb-1 mb-8">Article Archives</h2>
        
        {years.length > 0 ? (
          <div className="space-y-12">
            {years.map(year => (
              <div key={year} className="space-y-4">
                <h3 className="text-lg font-bold border-b border-slate-200 text-slate-500 font-sans tracking-tight uppercase">
                  {year}
                </h3>
                <ul className="list-none p-0 m-0 space-y-4">
                  {groupedPosts[year].map(({ slug, date, title, summary }) => (
                    <li key={slug} className="lwn-article">
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                        </span>
                        <div className="space-y-1">
                          <h4 className="m-0 text-md font-bold">
                            <Link href={`/posts/${slug}`} className="hover:underline">
                              {title}
                            </Link>
                          </h4>
                          <p className="text-sm text-slate-700 font-serif leading-relaxed m-0">
                            {summary}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="italic text-slate-500 font-serif">The archives are currently empty.</p>
        )}
      </section>
      
      <footer className="pt-8 border-t border-slate-200">
        <Link href="/" className="text-xs font-bold uppercase hover:underline text-slate-900">
          &laquo; Back to Home
        </Link>
      </footer>
    </div>
  );
}
