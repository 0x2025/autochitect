import { getPostData, getSortedPostsData } from "@/lib/posts";
import Link from "next/link";
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: "Post | Autonomous Architect" };
  const postData = await getPostData(slug);
  return {
    title: `${postData.title} | Autonomous Architect`,
    description: postData.summary,
  };
}

export async function generateStaticParams() {
  const posts = getSortedPostsData();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) return <div>Post not found</div>;
  
  const postData = await getPostData(slug);

  return (
    <article className="lwn-article max-w-none">
      <header className="mb-8 border-b-2 border-slate-800 pb-4">
        <h1 className="text-3xl font-serif italic m-0 mb-2">{postData.title}</h1>
        <div className="flex items-center gap-4 text-xs font-sans uppercase tracking-tight text-slate-500">
          <time dateTime={postData.date}>{postData.date}</time>
          <span className="border-l border-slate-300 pl-4">Tags: {postData.tags.join(", ")}</span>
        </div>
      </header>

      <div 
        className="lwn-post-content font-serif leading-relaxed text-slate-800"
        dangerouslySetInnerHTML={{ __html: postData.contentHtml || "" }} 
      />

      <footer className="mt-12 pt-8 border-t border-slate-200">
        <Link href="/" className="text-xs font-bold uppercase hover:underline text-slate-900">
          &laquo; Back to Home
        </Link>
      </footer>
    </article>
  );
}
