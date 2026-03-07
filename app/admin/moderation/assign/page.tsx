"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../lib/api";

interface ModeratorRow {
  profile_id: string;
  full_name: string | null;
  email: string;
  pending_tasks: number;
}

interface ModeratorsResponse {
  success?: boolean;
  data?: ModeratorRow[];
  pending_queue_total?: number;
}

async function fetchModerators(): Promise<{ moderators: ModeratorRow[]; pending_queue_total: number }> {
  const res = await api.get<ModeratorsResponse>("/mod/moderation/moderators");
  const body = res.data ?? {};
  const moderators = Array.isArray(body.data) ? body.data : [];
  const pending_queue_total = typeof body.pending_queue_total === "number" ? body.pending_queue_total : 0;
  return { moderators, pending_queue_total };
}

async function pushTasksRequest(payload: { moderatorProfileId: string; limit: number }) {
  const res = await api.post("/mod/moderation/push", payload);
  return res.data;
}

export default function ModeratorsPage() {
  const queryClient = useQueryClient();
  const [pushCounts, setPushCounts] = useState<Record<string, number>>({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "moderation", "moderators"],
    queryFn: fetchModerators,
  });

  const pushMutation = useMutation({
    mutationFn: pushTasksRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "moderation", "moderators"],
      });
    },
  });

  const apiError =
    (pushMutation.error as any)?.response?.data?.message ||
    (pushMutation.error as Error | null)?.message;

  const rows = data?.moderators ?? [];
  const pendingQueueTotal = data?.pending_queue_total ?? 0;

  const handleChangeCount = (profileId: string, value: string) => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    const maxAllowed = Math.min(50, pendingQueueTotal);
    const safe = Math.min(maxAllowed, Math.max(1, parsed));
    setPushCounts((prev) => ({ ...prev, [profileId]: safe }));
  };

  const handlePush = (profileId: string) => {
    const requested = pushCounts[profileId] ?? 5;
    const limit = Math.min(requested, pendingQueueTotal, 50);
    if (limit < 1) return;
    pushMutation.mutate({ moderatorProfileId: profileId, limit });
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-900">
            Moderators
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            See all moderators, how many pending tasks they have, and push new
            tasks to them. Moderators can also pull tasks themselves from My tasks.
          </p>
        </div>
        {!isLoading && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
            <span className="font-medium text-gray-700">Pending queue:</span>{" "}
            <span className="font-semibold text-gray-900">{pendingQueueTotal}</span>{" "}
            <span className="text-gray-600">tasks waiting to assign</span>
          </div>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-gray-600">Loading moderators…</p>
      )}

      {isError && (
        <p className="text-sm text-red-600">
          Failed to load moderators. {(error as any)?.message ?? "Check backend."}
        </p>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="text-sm text-gray-600">
          No moderators found yet. Create a moderator first.
        </p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  Moderator
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  Email
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  Pending tasks
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  Push tasks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((m) => {
                const value = pushCounts[m.profile_id] ?? 5;
                return (
                  <tr key={m.profile_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">
                      <div className="font-medium">
                        {m.full_name ?? "Unnamed moderator"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Profile ID:{" "}
                        <span className="font-mono">{m.profile_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{m.email}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {m.pending_tasks}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={Math.min(50, pendingQueueTotal) || 50}
                          value={value}
                          onChange={(e) =>
                            handleChangeCount(m.profile_id, e.target.value)
                          }
                          className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 outline-none ring-0 focus:border-primary-focus focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          disabled={pushMutation.isPending || pendingQueueTotal < 1}
                          onClick={() => handlePush(m.profile_id)}
                          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pushMutation.isPending ? "Pushing…" : "Push"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pushMutation.isError && (
        <p className="text-sm text-red-600">
          {apiError || "Failed to push tasks"}
        </p>
      )}

      {pushMutation.isSuccess && (
        <p className="text-sm text-green-600">Tasks pushed successfully.</p>
      )}
    </div>
  );
}

