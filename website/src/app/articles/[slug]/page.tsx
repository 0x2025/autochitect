import { getPostData, getSortedPostsData } from "@/lib/posts";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const posts = getSortedPostsData();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  try {
    const postData = await getPostData(slug);

    return (
      <article className="lwn-article">
        <header className="mb-8 border-b-2 border-slate-800 pb-2">
          <h1 className="text-3xl font-bold mb-2">{postData.title}</h1>
          <div className="lwn-article-meta text-[13px] text-slate-600 font-sans uppercase">
            {postData.date} | Tags: {postData.tags.join(", ")}
          </div>
        </header>

        <div 
          className="prose prose-slate max-w-none font-serif leading-relaxed text-lg"
          dangerouslySetInnerHTML={{ __html: postData.contentHtml || "" }} 
        />

        <footer className="mt-12 pt-8 border-t border-slate-200">
          <Link href="/" className="text-xs font-bold uppercase hover:underline text-slate-900">
            &laquo; Back to Home
          </Link>
        </footer>
      </article>
    );
  } catch (error) {
    notFound();
  }
}
