"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Mic } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [{ href: "/meetings", label: "Meetings", icon: Mic }] as const;

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-foreground">
      <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
      8x Fathom AI
    </span>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function UserBlock() {
  const router = useRouter();
  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }
  return (
    <div className="border-t border-border px-4 py-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary-soft text-xs font-medium text-primary">MM</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">Muhammad Mohsin</p>
          <p className="truncate text-xs text-muted-foreground">Demo workspace</p>
        </div>
      </div>
      <button
        type="button"
        onClick={signOut}
        className="mt-3 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground max-md:min-h-10"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Sign out
      </button>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center px-5">
        <Wordmark />
      </div>
      <div className="flex-1 px-3 py-2">
        <SidebarNav />
      </div>
      <UserBlock />
    </aside>
  );
}
