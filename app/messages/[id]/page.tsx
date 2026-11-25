import { MessageThread } from "@/src/features/messages/components/MessageThread";
import { getThread, listShareableCards } from "@/src/features/messages/message.service";
import { getSession } from "@/src/lib/session";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const metadata = { title: "Conversation · CollectorHub" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;

  const thread = await getThread(session.user.id, id);

  if (!thread) {
    notFound();
  }

  const cards = await listShareableCards();
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/messages"
            className="text-sm font-semibold text-mute underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            All messages
          </Link>
          <h1 className="mt-1 font-display text-3xl font-extrabold">
            {thread.other.name}
          </h1>
        </div>
        <Link
          href={`/players/${thread.other.id}`}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-soft hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          View profile
        </Link>
      </header>

      <MessageThread
        conversationId={thread.conversationId}
        viewerId={session.user.id}
        other={thread.other}
        initialMessages={thread.messages}
        cards={cards}
      />
    </div>
  );
}
