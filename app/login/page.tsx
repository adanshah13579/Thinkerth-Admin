"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../lib/api";

const STORAGE_EMAIL = "admin_login_email";
const STORAGE_PASSWORD = "admin_login_password";
const STORAGE_REMEMBER = "admin_login_remember";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_REMEMBER);
      if (saved === "1") {
        setRememberMe(true);
        const savedEmail = localStorage.getItem(STORAGE_EMAIL)?.trim();
        const savedPassword = localStorage.getItem(STORAGE_PASSWORD);
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword && savedPassword.length > 0) setPassword(savedPassword);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email: trimmedEmail,
        password: trimmedPassword,
      });
      const data = res.data?.data ?? res.data;
      const accessToken = data?.accessToken ?? null;
      const roles: string[] = Array.isArray(data?.roles) ? data.roles : [];

      if (!accessToken) {
        throw new Error("No access token returned from API (check backend response shape)");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("admin_access_token", accessToken);
        localStorage.setItem("admin_roles", JSON.stringify(roles));
        if (rememberMe) {
          localStorage.setItem(STORAGE_REMEMBER, "1");
          localStorage.setItem(STORAGE_EMAIL, trimmedEmail);
          localStorage.setItem(STORAGE_PASSWORD, trimmedPassword);
        } else {
          localStorage.removeItem(STORAGE_REMEMBER);
          localStorage.removeItem(STORAGE_EMAIL);
          localStorage.removeItem(STORAGE_PASSWORD);
        }
      }

      // Send to My tasks so moderators (who cannot access Pending queue) don't get 403 and redirect to login
      router.replace("/admin/moderation/my-tasks");
    } catch (err: any) {
      const data = err?.response?.data;
      let message =
        data?.message || err?.message || "Login failed";

      if (Array.isArray(data?.error)) {
        message = data.error
          .map((e: { path?: string[]; message?: string }) =>
            e.path?.length ? `${e.path.join(".")}: ${e.message}` : e.message
          )
          .join(". ");
      } else if (data?.error && typeof data.error === "string") {
        message = data.error;
      }

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-[var(--primary)]/5 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white/90 p-8 shadow-lg backdrop-blur">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold leading-tight text-gray-900">
            Thinkerth Admin
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with an account that has{" "}
            <span className="font-medium text-primary">
              moderator / admin / super_admin
            </span>{" "}
            role.
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-primary-focus focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 bg-white text-primary focus:ring-primary/60"
            />
            Remember me (pre-fill email and password next time)
          </label>

          {error && (
            <p className="text-sm text-error rounded-md bg-error-light/60 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

