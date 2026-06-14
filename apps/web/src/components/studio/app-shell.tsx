"use client";

import {
  BookCopy,
  Brain,
  Home,
  Inbox,
  PlugZap,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CogMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function AppShell({
  children,
  user,
  approvalsCount,
  runMode,
}: {
  children: React.ReactNode;
  user: { email: string; name: string };
  approvalsCount: number;
  runMode: "fixture" | "live";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const nav: NavItem[] = [
    { href: "/app", label: "Home", icon: Home },
    { href: "/builder", label: "Builder", icon: Sparkles },
    { href: "/approvals", label: "Approvals", icon: Inbox, badge: approvalsCount },
    { href: "/connections", label: "Connections", icon: PlugZap },
    { href: "/templates", label: "Templates", icon: BookCopy },
    { href: "/memory", label: "Memory", icon: Brain },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const title =
    nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label ??
    (pathname.startsWith("/runs") ? "Run detail" : "Cogwork");

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-paper-2">
      <aside className="border-r border-line bg-paper flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-line">
          <Link href="/app" className="flex items-center gap-2">
            <CogMark size={22} className="text-violet" />
            <span className="font-display font-bold text-ink">Cogwork</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm relative",
                  active
                    ? "bg-violet-tint text-violet font-medium"
                    : "text-ink-soft hover:bg-paper-3",
                )}
              >
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-violet" />}
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet px-1.5 text-[11px] font-medium text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line">
          <div className="px-2 py-2 text-xs text-muted truncate">{user.email}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-paper-3"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between gap-4 px-6 border-b border-line bg-paper">
          <h1 className="text-lg font-display font-semibold shrink-0">{title}</h1>
          <form
            className="hidden flex-1 max-w-sm md:block"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(search.trim() ? `/app?q=${encodeURIComponent(search.trim())}` : "/app");
            }}
          >
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workflows…"
              aria-label="Search workflows"
              className="h-9"
            />
          </form>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 h-[22px] text-[11px] font-medium",
                runMode === "fixture" ? "bg-amber-tint text-amber" : "bg-green-tint text-green",
              )}
              title={
                runMode === "fixture"
                  ? "Connectors return fixture data — no third-party credentials in use."
                  : "Connectors are live."
              }
            >
              {runMode} mode
            </span>
            <Link href="/builder">
              <Button size="sm">+ New workflow</Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
