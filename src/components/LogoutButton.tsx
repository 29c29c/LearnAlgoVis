"use client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button onClick={logout} className={compact ? "btn-secondary h-9 px-3 text-xs" : "btn-secondary h-9 flex-1 px-2 text-xs"}>
      退出
    </button>
  );
}
