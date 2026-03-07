"use client";

import { PostMedia } from "./PostMedia";

const MEDIA_SIZE = 280; // px - consistent for images and PDFs

function mediaUrlsToList(media_urls: unknown): string[] {
  if (Array.isArray(media_urls)) return media_urls.filter((u): u is string => typeof u === "string");
  if (media_urls && typeof media_urls === "object" && "urls" in media_urls && Array.isArray((media_urls as { urls: unknown }).urls)) {
    return ((media_urls as { urls: unknown[] }).urls).filter((u): u is string => typeof u === "string");
  }
  return [];
}

export type PostCardPost = {
  id: string;
  content: string | null;
  post_type: string;
  media_urls: unknown;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
};

export interface PostCardProps {
  post: PostCardPost;
  postId: string;
  onImageClick?: (src: string) => void;
  variant?: "light" | "dark";
}

const light = {
  bg: "bg-white",
  border: "border-gray-200",
  avatarBg: "bg-gray-200",
  name: "text-gray-900",
  meta: "text-gray-500",
  content: "text-gray-700",
  empty: "text-gray-500",
};

const dark = {
  bg: "bg-transparent",
  border: "border-transparent",
  avatarBg: "bg-slate-800",
  name: "text-slate-200",
  meta: "text-slate-500",
  content: "text-slate-300",
  empty: "text-slate-500",
};

const labelClass = "text-xs font-medium uppercase tracking-wide";

export function PostCard({ post, postId, onImageClick, variant = "light" }: PostCardProps) {
  const theme = variant === "dark" ? dark : light;
  const mediaUrls = mediaUrlsToList(post.media_urls);
  const hasMedia = mediaUrls.length > 0;
  const labelMuted = variant === "dark" ? "text-slate-500" : "text-gray-500";

  return (
    <div className={`p-5 ${theme.bg} rounded-b-xl ${variant === "light" ? "border-t border-gray-100" : ""}`}>
      <div className="flex gap-4">
        {/* Left: content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 shrink-0 overflow-hidden rounded-full ${theme.avatarBg}`}>
              {post.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatar_url}
                  alt=""
                  className="h-12 w-12 object-cover"
                />
              ) : (
                <div className={`flex h-12 w-12 items-center justify-center text-base font-medium ${theme.meta}`}>
                  {(post.author?.full_name ?? "?")[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className={`${labelMuted} ${labelClass}`}>Author</p>
              <p className={`font-medium text-base ${theme.name}`}>
                {post.author?.full_name ?? "Unknown"}
              </p>
              <p className={`${labelMuted} ${labelClass} mt-2`}>Date & type</p>
              <p className={`text-sm ${theme.meta}`}>
                {new Date(post.created_at).toLocaleString()} · {post.post_type}
              </p>
              <p className={`${labelMuted} ${labelClass} mt-2`}>Post ID</p>
              <div className="flex items-center gap-2">
                <code className={`font-mono text-sm truncate max-w-[220px] ${theme.content}`}>{postId}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(postId)}
                  className={`shrink-0 ${variant === "dark" ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"}`}
                  title="Copy post ID"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              {post.content && (
                <>
                  <p className={`${labelMuted} ${labelClass} mt-3`}>Content</p>
                  <p className={`mt-1 whitespace-pre-wrap text-lg leading-relaxed ${theme.content}`}>
                    {post.content}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: media - fixed size, click opens dialog for full view */}
        {hasMedia && (
          <div className="shrink-0 w-[280px]">
            <p className={`${labelMuted} ${labelClass} mb-1`}>Media</p>
            <PostMedia
              urls={mediaUrls}
              onImageClick={onImageClick}
              maxHeight={MEDIA_SIZE}
              maxWidth={MEDIA_SIZE}
            />
          </div>
        )}
      </div>
    </div>
  );
}
