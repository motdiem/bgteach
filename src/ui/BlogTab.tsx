import { useMemo, useState } from "react";
import { renderMarkdown } from "./markdown";

// Bundle every blog post as a raw string at build time.
const FILES = import.meta.glob("../content/blog/*.md", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

interface Post {
  slug: string;
  title: string;
  body: string;
}

function buildPosts(): Post[] {
  return Object.entries(FILES)
    .sort(([a], [b]) => a.localeCompare(b)) // filename order (01-, 02-, …)
    .map(([path, raw]) => {
      const titleMatch = /^#\s+(.*)$/m.exec(raw);
      return {
        slug: path.split("/").pop()!.replace(/\.md$/, ""),
        title: titleMatch ? titleMatch[1] : path,
        body: raw,
      };
    });
}

export default function BlogTab({ onClose }: { onClose: () => void }) {
  const posts = useMemo(buildPosts, []);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const post = posts.find((p) => p.slug === openSlug) ?? null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1220] flex flex-col max-w-xl mx-auto">
      <header className="safe-top px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-800">
        <button
          onClick={() => (post ? setOpenSlug(null) : onClose())}
          className="text-sm text-teal-400"
        >
          {post ? "← All posts" : "← Close"}
        </button>
        <span className="text-sm font-semibold text-slate-200">The story</span>
        <span className="w-12" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 safe-bottom">
        {!post && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400 mb-2">
              How this teaching app came together — the idea, the engine, and turning cold equity into plain English.
            </p>
            {posts.map((p, i) => (
              <button
                key={p.slug}
                onClick={() => setOpenSlug(p.slug)}
                className="w-full text-left rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-3 active:scale-[0.99]"
              >
                <div className="text-xs text-slate-500">Part {i + 1}</div>
                <div className="font-medium text-slate-100">{p.title}</div>
              </button>
            ))}
          </div>
        )}

        {post && (
          <article
            className="pb-8"
            // Content is our own trusted, escaped markdown.
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
          />
        )}
      </div>
    </div>
  );
}
