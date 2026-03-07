"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../../lib/api";

type FormState = {
  email: string;
  password: string;
  fullName: string;
};

async function createModeratorRequest(payload: FormState) {
  const res = await api.post("/admin/create-moderator", payload);
  return res.data;
}

export default function CreateModeratorPage() {
  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    fullName: "",
  });

  const mutation = useMutation({
    mutationFn: createModeratorRequest,
    onSuccess: () => {
      toast.success("Moderator created successfully.");
      setForm({ email: "", password: "", fullName: "" });
    },
    onError: (err: { response?: { data?: { message?: string; error?: unknown } }; message?: string }) => {
      const data = err?.response?.data;
      let msg = data?.message ?? err?.message ?? "Request failed";
      if (Array.isArray(data?.error)) {
        msg = (data.error as { path?: string[]; message?: string }[])
          .map((e) => (e.path?.length ? `${e.path.join(".")}: ${e.message}` : e.message))
          .join(". ");
      } else if (data?.error && typeof data.error === "string") {
        msg = data.error;
      }
      toast.error(msg);
    },
  });

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = {
      email: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
    };
    if (!trimmed.email || !trimmed.password || !trimmed.fullName) {
      return;
    }
    mutation.mutate(trimmed);
  };

  const err = mutation.error as {
    response?: { status?: number; data?: { message?: string; error?: unknown } };
    message?: string;
  } | undefined;
  const data = err?.response?.data;
  let apiError = data?.message ?? err?.message ?? "Request failed";
  if (Array.isArray(data?.error)) {
    apiError = (data.error as { path?: string[]; message?: string }[])
      .map((e) => (e.path?.length ? `${e.path.join(".")}: ${e.message}` : e.message))
      .join(". ");
  } else if (data?.error && typeof data.error === "string") {
    apiError = data.error;
  }
  const isNetworkError =
    apiError === "Network Error" || err?.message === "Network Error";

  return (
    <div className="max-w-lg space-y-6 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
      <div>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-900">
          Create moderator
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Only{" "}
          <span className="font-medium text-primary">super_admin</span> can
          call{" "}
          <code className="rounded-md bg-gray-900/90 px-2 py-0.5 text-xs font-mono text-gray-100">
            POST /admin/create-moderator
          </code>
          . Other roles will receive{" "}
          <span className="font-mono text-xs text-gray-800">403</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-700">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-primary-focus focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-700">
            Password
          </label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-primary-focus focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-700">
            Full name
          </label>
          <input
            type="text"
            required
            value={form.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-primary-focus focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {mutation.isError && (
          <div className="rounded-md border border-error/40 bg-error-light/60 p-4 text-sm text-error">
            <p className="font-medium">
              {err?.response?.status ? `HTTP ${err.response.status}: ` : ""}
              {apiError}
            </p>
            {isNetworkError && (
              <p className="mt-2 text-xs text-gray-600">
                Check that the backend is running at{" "}
                <code className="rounded bg-gray-900/90 px-1 text-gray-100">
                  {process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api"}
                </code>{" "}
                and that CORS allows this app’s origin.
              </p>
            )}
          </div>
        )}

        {mutation.isSuccess && (
          <p className="text-sm text-success rounded bg-success-light/60 px-3 py-2">
            Moderator created successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          {mutation.isPending ? "Creating…" : "Create moderator"}
        </button>
      </form>
    </div>
  );
}

