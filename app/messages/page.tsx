import { AutoRefresh } from "@/src/components/ui/AutoRefresh";
import { listConversations } from "@/src/features/messages/message.service";
import { getSession } from "@/src/lib/session";
import { formatTimeAgo } from "@/src/lib/time";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Messages · CollectorHub" };

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const conversations = await listConversations(session.user.id);

  return (
    <div className="relative overflow-x-clip">
      <AutoRefresh intervalMs={10_000} />

      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        Chat
      </span>

      <div className="relative mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-extrabold">Messages</h1>
          <p className="mt-1 text-mute">
            To start a conversation, open a player&apos;s profile and press
            &ldquo;Message&rdquo;.
          </p>
        </header>

        {conversations.length > 0 ? (
          <ul className="space-y-3">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className={`block rounded-[28px] bg-white px-6 py-4 shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    conversation.unreadCount > 0
                      ? "ring-2 ring-gold-500"
                      : "hover:bg-white/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold">
                        {conversation.other?.name ?? "Unknown player"}
                        {conversation.unreadCount > 0 && (
                          <span className="rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold text-white">
                            {conversation.unreadCount}
                            <span className="sr-only"> unread</span>
                          </span>
                        )}
                      </p>
                      <p
                        className={`mt-0.5 truncate text-sm ${
                          conversation.unreadCount > 0
                            ? "font-semibold text-ink"
                            : "text-mute"
                        }`}
                      >
                        {conversation.preview}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-mute">
                      {formatTimeAgo(conversation.lastMessageAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-soft">
            <h2 className="font-display text-xl font-bold">
              No conversations yet
            </h2>
            <p className="mt-1 text-mute">
              Find a player from the market or an order, then press
              &ldquo;Message&rdquo; on their profile.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
