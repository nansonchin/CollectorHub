import { MarkAllReadButton } from "@/src/features/notifications/components/MarkAllReadButton";
import { describeNotification } from "@/src/features/notifications/notifications.render";
import { listNotifications } from "@/src/features/notifications/notifications.service";
import { getSession } from "@/src/lib/session";
import { formatTimeAgo } from "@/src/lib/time";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Notifications · CollectorHub" };

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const userId = session.user.id;
  const notifications = await listNotifications(userId);
  const unread = notifications.filter((n) => n.readAt === null).length;

  return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        News
      </span>
      <div className="relative mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-extrabold">
              Notifications
            </h1>
            <p className="mt-1 text-mute">
              {unread > 0 ? `${unread} unread` : "You're all caught up."}
            </p>
          </div>
          {unread > 0 && <MarkAllReadButton />}
        </header>
        {notifications.length > 0 ? (
          <ul className="space-y-3">
            {notifications.map((notification) => {
              const { title, body, href } = describeNotification(
                notification.type,
                notification.data,
                userId,
              );
              const isUnread = notification.readAt === null;

              return (
                <li key={notification.id}>
                  <Link
                    href={href}
                    className={`block rounded-[28px] px-6 py-4 shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                      isUnread
                        ? "bg-white ring-2 ring-gold-500"
                        : "bg-white/70 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold">
                          {title}
                          {isUnread && (
                            <span className="rounded-md bg-gold-100 px-2 py-0.5 text-xs font-bold text-[#7a5a10]">
                              New
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-sm text-ink/80">{body}</p>
                      </div>
                      <p className="shrink-0 text-xs text-mute">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-soft">
            <h2 className="font-display text-xl font-bold">Nothing here yet</h2>
            <p className="mt-1 text-mute">
              Trade offers, quest updates, sales and reviews will show up here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
