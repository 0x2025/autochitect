import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';

const postsDirectory = path.join(process.cwd(), 'contents');

export interface ConceptProperty {
  label: string;
  value: string;
}

export type RightPanelSection =
  | { type: "properties"; title?: string; items: ConceptProperty[] }
  | { type: "notes";      title?: string; content: string }
  | { type: "list";       title?: string; items: string[] };

export interface PostData {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  sections?: RightPanelSection[];
  // legacy fields kept for backward compat — auto-converted to sections
  properties?: ConceptProperty[];
  notes?: string;
  related?: string[];
  contentHtml?: string;
}

function buildSections(data: Record<string, unknown>): RightPanelSection[] {
  // Explicit sections array wins
  if (Array.isArray(data.sections) && data.sections.length > 0) {
    return data.sections as RightPanelSection[];
  }
  // Fall back: build sections from legacy fields
  const sections: RightPanelSection[] = [];
  const props = data.properties as ConceptProperty[] | undefined;
  if (props && props.length > 0) {
    sections.push({ type: "properties", title: "Concept Details", items: props });
  }
  if (typeof data.notes === "string" && data.notes.trim()) {
    sections.push({ type: "notes", title: "Engineering Notes", content: data.notes });
  }
  if (Array.isArray(data.related) && data.related.length > 0) {
    sections.push({ type: "list", title: "Related Concepts", items: data.related as string[] });
  }
  return sections;
}

export function getSortedPostsData(): PostData[] {
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = matter(fileContents);

      return {
        slug,
        title: matterResult.data.title,
        date: matterResult.data.date,
        summary: matterResult.data.summary,
        tags: matterResult.data.tags || [],
        sections: buildSections(matterResult.data),
      } as PostData;
    });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostData(slug: string): Promise<PostData> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const matterResult = matter(fileContents);

  const processedContent = await remark()
    .use(remarkGfm)
    .use(html)
    .process(matterResult.content);
  const contentHtml = processedContent.toString();

  return {
    slug,
    contentHtml,
    title: matterResult.data.title,
    date: matterResult.data.date,
    summary: matterResult.data.summary,
    tags: matterResult.data.tags || [],
    sections: buildSections(matterResult.data),
  } as PostData;
}
