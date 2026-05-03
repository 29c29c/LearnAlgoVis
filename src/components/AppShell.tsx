import Link from "next/link";
import { BookOpen, Compass, FilePlus2, ShieldCheck } from "lucide-react";
import { CurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { AiSettingsButton } from "@/components/AiSettingsButton";

const navItems = [
  { href: "/app", label: "我的目录", icon: BookOpen },
  { href: "/workshop", label: "创意工坊", icon: Compass },
  { href: "/import", label: "导入与提示词", icon: FilePlus2 },
];

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-linen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-paper px-4 py-5 lg:block">
        <Link href="/app" className="block text-2xl font-black tracking-tight">LearnAlgoVis</Link>
        <div className="mt-1 text-sm text-ink/60">算法动画目录与工坊</div>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-ink/75 hover:bg-linen hover:text-ink">
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-ink/75 hover:bg-linen hover:text-ink">
              <ShieldCheck className="h-4 w-4" />
              管理后台
            </Link>
          )}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-line bg-linen p-3">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          <div className="truncate text-xs text-ink/60">{user.email}</div>
          <div className="mt-3 flex gap-2">
            <AiSettingsButton />
            <LogoutButton />
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/app" className="text-lg font-black">LearnAlgoVis</Link>
            <div className="flex gap-2">
              <AiSettingsButton />
              <LogoutButton compact />
            </div>
          </div>
          <nav className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-md border border-line px-2 py-2 text-center font-semibold">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
