"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { ImageDialog } from "../../../components/ImageDialog";
import { PostCard } from "../../../components/PostCard";

const PAGE_SIZE = 10;

type PostEntity = {
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

type ModerationTask = {
  id: string;
  entity_type: string;
  entity_id: string;
  report_count?: number;
  status: string;
  created_at: string;
  entity?: PostEntity | null;
};

type PendingResponse = {
  data: ModerationTask[];
  page: number;
  limit: number;
  count: number;
  total: number;
};

async function fetchPendingTasks(page: number, limit: number): Promise<PendingResponse> {
  const res = await api.get("/mod/moderation/pending", {
    params: { page, limit },
  });
  const body = res.data ?? {};
  const data = Array.isArray(body.data) ? body.data : [];
  return {
    data,
    page: body.page ?? page,
    limit: body.limit ?? limit,
    count: body.count ?? data.length,
    total: body.total ?? data.length,
  };
}

export default function ModerationPage() {
  const [page, setPage] = useState(1);
  const [imageDialogSrc, setImageDialogSrc] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "moderation", "pending", page],
    queryFn: () => fetchPendingTasks(page, PAGE_SIZE),
  });

  const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string } | undefined;
  const status = err?.response?.status;
  const message = err?.response?.data?.message ?? err?.message ?? "Request failed";

  const tasks = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-4">
      <ImageDialog src={imageDialogSrc} onClose={() => setImageDialogSrc(null)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-900">
            Moderation Queue
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Reported items only. Full post shown. Assign to moderators from My tasks (Pull new tasks).
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-600">Loading pending tasks…</p>
      )}

      {isError && (
        <div className="rounded-md border border-error/40 bg-error-light/60 p-4 text-sm text-error">
          <p className="font-medium">Failed to load tasks.</p>
          <p className="mt-1">
            {status ? `HTTP ${status}: ` : ""}{message}
          </p>
          <p className="mt-2 text-xs text-gray-600">
            Ensure the backend is running at{" "}
            <code className="rounded bg-gray-900/90 px-1 text-gray-100">
              {process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api"}
            </code>{" "}
            and your account has <strong>admin</strong> or <strong>super_admin</strong> role.
          </p>
        </div>
      )}

      {!isLoading && !isError && (!data || tasks.length === 0) && (
        <p className="text-sm text-gray-600">
          No reported items pending. Only tasks with at least one report are shown.
        </p>
      )}

      {!isLoading && !isError && tasks.length > 0 && (
        <>
          <div className="space-y-6">
            {tasks.map((task) => {
              const post = task.entity_type === "post" ? task.entity : null;

              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Type</span>
                      <span className="capitalize font-medium text-gray-900">{task.entity_type}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-gray-600">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Reports</span>
                      <span>{task.report_count ?? 0} {(task.report_count ?? 0) !== 1 ? "reports" : "report"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-gray-600">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Added</span>
                      <span>{new Date(task.created_at).toLocaleString()}</span>
                    </span>
                  </div>

                  {post ? (
                    <PostCard
                      post={post}
                      postId={task.entity_id}
                      onImageClick={setImageDialogSrc}
                      variant="light"
                    />
                  ) : (
                    <div className="p-4 text-sm text-gray-500">
                      No post details (entity_type: {task.entity_type}, id: {task.entity_id})
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-1.5">Page {page} of {totalPages}</span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
