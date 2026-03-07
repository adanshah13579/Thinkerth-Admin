"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../../../lib/api";
import { ImageDialog } from "../../../../components/ImageDialog";
import { ConfirmModal } from "../../../../components/ConfirmModal";
import { PostCard } from "../../../../components/PostCard";

const PAGE_SIZE = 10;

type ModeratorRow = {
  profile_id: string;
  full_name: string | null;
  email: string;
  pending_tasks: number;
};


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
  reviewed_at?: string | null;
  entity?: PostEntity | null;
  assigned_to?: {
    id: string;
    full_name: string | null;
    user?: { email: string };
  } | null;
};

type SpecialTasksResponse = {
  data: ModerationTask[];
  page: number;
  limit: number;
  count: number;
  total: number;
};

async function fetchSpecialTasks(page: number, limit: number): Promise<SpecialTasksResponse> {
  const res = await api.get("/mod/moderation/special", {
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

async function reviewTask(id: string, action: "approve" | "flag") {
  await api.patch(`/mod/moderation/${id}/review`, { action });
}

async function fetchModerators(): Promise<ModeratorRow[]> {
  const res = await api.get("/mod/moderation/moderators");
  const body = res.data ?? {};
  return Array.isArray(body.data) ? body.data : [];
}

async function assignSpecialRequest(payload: { postId: string; moderatorProfileId: string }) {
  await api.post("/mod/moderation/assign-special", payload);
}

export default function SpecialCasesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [imageDialogSrc, setImageDialogSrc] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [assignPostId, setAssignPostId] = useState<string>("");
  const [assignModeratorId, setAssignModeratorId] = useState<string>("");
  const [flagConfirmTaskId, setFlagConfirmTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rolesJson = localStorage.getItem("admin_roles");
      const roles: string[] = rolesJson ? JSON.parse(rolesJson) : [];
      setIsAdmin(roles.includes("admin") || roles.includes("super_admin"));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const { data: moderatorsData } = useQuery({
    queryKey: ["admin", "moderation", "moderators"],
    queryFn: fetchModerators,
    enabled: isAdmin,
  });

  const assignMutation = useMutation({
    mutationFn: assignSpecialRequest,
    onSuccess: () => {
      setAssignPostId("");
      setAssignModeratorId("");
      queryClient.invalidateQueries({ queryKey: ["admin", "moderation", "special"] });
      toast.success("Task assigned successfully.");
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Assign failed");
    },
  });

  const moderators = moderatorsData ?? [];

  const handleAssignSpecial = () => {
    if (!assignPostId || !assignModeratorId) return;
    assignMutation.mutate({ postId: assignPostId, moderatorProfileId: assignModeratorId });
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "moderation", "special", page],
    queryFn: () => fetchSpecialTasks(page, PAGE_SIZE),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "flag" }) =>
      reviewTask(id, action),
    onSuccess: (_, { action }) => {
      setReviewingTaskId(null);
      setFlagConfirmTaskId(null);
      queryClient.invalidateQueries({
        queryKey: ["admin", "moderation", "special"],
      });
      toast.success(
        action === "approve"
          ? "Post approved. It remains visible."
          : "Post flagged and removed from the feed."
      );
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
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
    <div className="space-y-6">
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

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-900">
            Special cases
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isAdmin
              ? "Tasks you've assigned to moderators. View status and who they're assigned to."
              : "Cases explicitly assigned by an admin. These are prioritized and separate from your regular pulled tasks."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <h2 className="text-base font-semibold text-gray-900">Assign special task to moderator</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4 ml-7">
            Enter the post ID (copy it from a post in the Pending queue).
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Post ID
              </label>
              <input
                type="text"
                value={assignPostId}
                onChange={(e) => setAssignPostId(e.target.value.trim())}
                placeholder="e.g. abc123-def456-..."
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-mono min-w-[280px] placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Moderator
              </label>
              <select
                value={assignModeratorId}
                onChange={(e) => setAssignModeratorId(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 min-w-[200px] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Select moderator…</option>
                {moderators.map((m) => (
                  <option key={m.profile_id} value={m.profile_id}>
                    {m.full_name ?? "Unnamed"} ({m.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAssignSpecial}
              disabled={!assignPostId || !assignModeratorId || assignMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-gray-600">Loading special cases…</p>
      )}

      {isError && (
        <p className="text-sm text-red-600">
          Failed to load special cases. Check your admin token and backend.
        </p>
      )}

      {!isLoading && !isError && tasks.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            {isAdmin
              ? "No special tasks assigned yet. Use the form above to assign a post to a moderator."
              : "You don't have any special cases assigned by admins yet."}
          </p>
        </div>
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
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Type</span>
                        <span className="capitalize font-medium text-gray-900">{task.entity_type}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Reports</span>
                        <span>{task.report_count ?? 0} {(task.report_count ?? 0) !== 1 ? "reports" : "report"}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Assigned</span>
                        <span>{task.assigned_at ? new Date(task.assigned_at).toLocaleString() : "—"}</span>
                      </span>
                      {isAdmin && task.assigned_to && (
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">To</span>
                          <strong>{task.assigned_to.full_name ?? "—"}</strong>
                          <span className="text-gray-500">({task.assigned_to.user?.email ?? "—"})</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            task.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : task.status === "reviewed"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                        {task.status === "pending" ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : task.status === "reviewed" ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                          </svg>
                        )}
                        {task.status}
                        </span>
                      </span>
                    </div>
                    {task.status === "pending" && (
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
                    )}
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

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-1.5 text-xs text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

