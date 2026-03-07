"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ConfirmModal } from "../../components/ConfirmModal";

const ALL_NAV_ITEMS = [
  { href: "/admin/moderation", label: "Pending queue", roles: ["admin", "super_admin"] },
  { href: "/admin/moderation/my-tasks", label: "My tasks", roles: ["moderator", "admin", "super_admin"] },
  { href: "/admin/moderation/special", label: "Special cases", roles: ["moderator", "admin", "super_admin"] },
  { href: "/admin/moderation/assign", label: "Moderators", roles: ["admin", "super_admin"] },
  { href: "/admin/create-moderator", label: "Create moderator", roles: ["super_admin"] },
];

function getNavItemsForRoles(roles: string[]) {
  if (!roles.length) return ALL_NAV_ITEMS;
  return ALL_NAV_ITEMS.filter((item) =>
    item.roles.some((r) => roles.includes(r))
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [navItems, setNavItems] = useState<typeof ALL_NAV_ITEMS>(ALL_NAV_ITEMS);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("admin_access_token")
        : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    const rolesJson =
      typeof window !== "undefined" ? localStorage.getItem("admin_roles") : null;
    const roles: string[] = rolesJson ? (() => {
      try {
        return JSON.parse(rolesJson);
      } catch {
        return [];
      }
    })() : [];
    setNavItems(getNavItemsForRoles(roles));

    const moderatorOnly = roles.length === 1 && roles[0] === "moderator";
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (moderatorOnly && path && !path.startsWith("/admin/moderation/my-tasks")) {
      router.replace("/admin/moderation/my-tasks");
      return;
    }
    setReady(true);
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_roles");
    }
    router.replace("/login");
  };

  if (!ready) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 text-gray-900">
      <ConfirmModal
        open={showLogoutConfirm}
        title="Log out"
        message="Are you sure you want to log out of the admin panel?"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      <aside className="flex-shrink-0 w-64 flex flex-col border-r border-gray-200 bg-[var(--background)]/90 p-4 overflow-y-auto">
        <div className="mb-6 text-lg font-semibold tracking-tight text-gray-900">
          Thinkerth Admin
        </div>
        <nav className="flex-1 min-h-0 space-y-1 text-sm">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm transition-all ${
                  active
                    ? "text-[var(--primary)] bg-[var(--primary)]/10"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="mt-4 inline-flex items-center justify-center rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-[var(--primary)] transition-colors"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 min-h-0 overflow-auto p-6">{children}</main>
    </div>
  );
}

