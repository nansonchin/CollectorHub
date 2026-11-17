 "use client"
import {
  ArrowLeftRight,
  Backpack,
  Bell,
  LayoutGrid,
  ScrollText,
  Shield,
  Store,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/collection", label: "Collecton", icon: LayoutGrid, enabled: true },
  { href: "/market", label: "Market", icon: Store, enabled: false },
  { href: "/inventory", label: "Inventory", icon: Backpack, enabled: false },
  { href: "/quests", label: "Quests", icon: ScrollText, enabled: false },
  { href: "/guild", label: "Guild", icon: Shield, enabled: false },
  { href: "/trade", label: "Trade", icon: ArrowLeftRight, enabled: false },
];

const itemBase =
  "flex h-11 shrink-0 items-center gap-2 border-b-[3px] px-3 text-sm font-semibold";

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="relative z-20 flex-items-center gap-3 rounded-[28px] bg-white px-4 shadow-soft sm:gap-5 sm:px-6">
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
        className="flex flex-1 items-center  gap-1 overflow-x-auto pt-[3px]"
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
        <button
          type="button"
          disabled
          aria-label="Notifications"
          className="grid size-10 place-items-center rounded-full text-mute/60"
        >
          <Bell size={18} aria-hidden />
        </button>
        <button
          type="button"
          disabled
          aria-label="Profile"
          className="grid size-10 place-items-center rounded-full bg-paper text-mute/60"
        >
          <User size={18} aria-hidden />
        </button>
      </div>
    </header>
  );
}
