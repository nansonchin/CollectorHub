"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Backpack,
  Bell,
  Coins,
  LayoutGrid,
  ScrollText,
  Shield,
  Store,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/collection", label: "Collection", icon: LayoutGrid, enabled: true },
  { href: "/market", label: "Market", icon: Store, enabled: true },
  { href: "/inventory", label: "Inventory", icon: Backpack, enabled: true },
  { href: "/quests", label: "Quests", icon: ScrollText, enabled: false },
  { href: "/guild", label: "Guild", icon: Shield, enabled: false },
  { href: "/trade", label: "Trade", icon: ArrowLeftRight, enabled: false },
];

const itemBase =
  "flex h-11 shrink-0 items-center gap-2 border-b-[3px] px-3 text-sm font-semibold";

export function TopNav({ user }: { user: { name: string; gold: number } | null }) {
  const pathname = usePathname();

  return (
    <header className="relative z-20 flex items-center gap-3 rounded-[28px] bg-white px-4 shadow-soft sm:gap-5 sm:px-6">
      <Link href="/" className="flex shrink-0 items-center gap-2.5 py-3">
        <span aria-hidden className="flex items-center gap-[3px]">
          <i className="block h-6 w-2.5 -skew-x-12 bg-gold-500" />
          <i className="block h-6 w-1 -skew-x-12 bg-ink" />
        </span>
        <span className="hidden font-display text-lg font-bold sm:inline">
          CollectorHub
        </span>
      </Link>

      <nav
        aria-label="Main"
        className="flex flex-1 items-center gap-1 overflow-x-auto pt-[3px]"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon, enabled }) => {
          if (!enabled) {
            return (
              <span
                key={href}
                aria-disabled="true"
                title="Coming soon"
                className={`${itemBase} cursor-not-allowed border-transparent text-mute/60`}
              >
                <Icon size={18} aria-hidden />
                {label}
              </span>
            );
          }

          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${itemBase} ${
                active
                  ? "border-gold-500 text-ink"
                  : "border-transparent text-mute hover:text-ink"
              }`}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-1 py-3">
        {user && (
          <div
            title="Your Gold"
            className="mr-1 flex h-10 items-center gap-1.5 rounded-full bg-gold-100 px-3 text-sm font-bold text-[#7a5a10]"
          >
            <Coins size={16} aria-hidden />
            <span className="sr-only">Gold:</span>
            {user.gold.toLocaleString("en-US")}
          </div>
        )}
        <button
          type="button"
          disabled
          aria-label="Notifications"
          className="grid size-10 place-items-center rounded-full text-mute/60"
        >
          <Bell size={18} aria-hidden />
        </button>
        {user ? (
          <Link
            href="/account"
            aria-label={`Account: ${user.name}`}
            className="flex h-10 items-center gap-2 rounded-full bg-paper pl-1 pr-1 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:pr-4"
          >
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-full bg-ink text-xs font-bold text-white"
            >
              {user.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className="flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}