"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../../../lib/api";
import { ImageDialog } from "../../../../components/ImageDialog";
import { ConfirmModal } from "../../../../components/ConfirmModal";
import { PostCard } from "../../../../components/PostCard";

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
  assigned_at: string | null;
  entity?: PostEntity | null;
};

type MyTasksResponse = {
  data: ModerationTask[];
  page: number;
  limit: number;
  count: number;
  total: number;
};

async function fetchMyTasks(page: number, limit: number): Promise<MyTasksResponse> {
  const res = await api.get("/mod/moderation/my-tasks", {
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

async function pullTasks(): Promise<ModerationTask[]> {
  const res = await api.post("/mod/moderation/pull");
  return Array.isArray(res.data) ? res.data : [];
}

async function reviewTask(id: string, action: "approve" | "flag") {
  await api.patch(`/mod/moderation/${id}/review`, { action });
}

export default function MyTasksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [flagConfirmTaskId, setFlagConfirmTaskId] = useState<string | null>(null);
  const [imageDialogSrc, setImageDialogSrc] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["admin", "moderation", "my-tasks", page],
    queryFn: () => fetchMyTasks(page, PAGE_SIZE),
  });

  const pullMutation = useMutation({
    mutationFn: pullTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "moderation", "my-tasks"],
      });
      toast.success("Tasks refreshed.");
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? "Failed to pull tasks");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "flag" }) =>
      reviewTask(id, action),
    onSuccess: (_, { action }) => {
      setReviewingTaskId(null);
      setFlagConfirmTaskId(null);
      queryClient.invalidateQueries({
        queryKey: ["admin", "moderation", "my-tasks"],
      });
      toast.success(
        action === "approve"
          ? "Post approved. It remains visible."
          : "Post flagged and removed from the feed."
      );
    },
    onError: (err: { response?: { data?: { message?: string }; status?: number }; message?: string }) => {
      setReviewingTaskId(null);
      setFlagConfirmTaskId(null);
      toast.error(err?.response?.data?.message ?? err?.message ?? "Review failed");
    },
  });

  const handleApprove = (id: string) => {
    setReviewingTaskId(id);
    reviewMutation.mutate({ id, action: "approve" });
  };

  const handleFlagClick = (id: string) => {
    setFlagConfirmTaskId(id);
  };

  const handleFlagConfirm = () => {
    if (!flagConfirmTaskId) return;
    setReviewingTaskId(flagConfirmTaskId);
    reviewMutation.mutate({ id: flagConfirmTaskId, action: "flag" });
  };

  const tasks = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-4">
      <ImageDialog src={imageDialogSrc} onClose={() => setImageDialogSrc(null)} />
      <ConfirmModal
        open={flagConfirmTaskId !== null}
        title="Flag post"
        message="This post will be removed from the feed (soft-deleted). The author will still see it in their activity. Continue?"
        confirmLabel="Flag"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleFlagConfirm}
        onCancel={() => setFlagConfirmTaskId(null)}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-900">My tasks</h1>
          <p className="mt-2 text-sm text-gray-600">
            Reported items only. Full post shown for review. Approve keeps it live; Flag removes it from the feed.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => refetchTasks()}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => pullMutation.mutate()}
            disabled={pullMutation.isPending}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
          >
            {pullMutation.isPending ? "Pulling…" : "Pull new tasks"}
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-600">Loading your moderation tasks…</p>
      )}

      {isError && (
        <p className="text-sm text-error">
          Failed to load your tasks. Check your admin token and backend.
        </p>
      )}

      {!isLoading && !isError && (!data || tasks.length === 0) && (
        <p className="text-sm text-gray-600">
          You don&apos;t have any assigned reported tasks yet.
        </p>
      )}

      {!isLoading && !isError && tasks.length > 0 && (
        <>
          <div className="space-y-6">
            {tasks.map((task) => {
              const post = task.entity_type === "post" ? task.entity : null;
              const isReviewing = reviewingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Type</span>
                        <span className="capitalize font-medium text-gray-900">{task.entity_type}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Reports</span>
                        <span>{task.report_count ?? 0} {(task.report_count ?? 0) !== 1 ? "reports" : "report"}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Assigned</span>
                        <span>{task.assigned_at ? new Date(task.assigned_at).toLocaleString() : "—"}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-500">Actions:</span>
                      <button
                        type="button"
                        onClick={() => handleApprove(task.id)}
                        disabled={isReviewing}
                        className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isReviewing ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFlagClick(task.id)}
                        disabled={isReviewing}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                        Flag
                      </button>
                    </div>
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
