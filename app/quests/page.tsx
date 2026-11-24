import Link from "next/link";
import { Pagination } from "@/src/components/ui/Pagination";
import {
  listCardsQuerySchema,
  parseListCardsQuery,
} from "@/src/features/cards/cards.schema";
import { formatCardNumber } from "@/src/features/cards/cards.meta";
import { filtersHref } from "@/src/features/cards/cards.url";
import { CardTile } from "@/src/features/cards/components/CardTile";
import { CollectionFilters } from "@/src/features/cards/components/CollectionFilters";
import {
  getOwnedQuantities,
  getWalletBalance,
} from "@/src/features/economy/economy.service";
import { PostQuestDialog } from "@/src/features/quests/components/PostQuestDialog";
import { QuestActions } from "@/src/features/quests/components/QuestActions";
import {
  listMyQuests,
  listQuestBoard,
  listQuestableCards,
  tryExpireStaleQuests,
} from "@/src/features/quests/quests.service";
import { getSession } from "@/src/lib/session";
import { formatTimeLeft } from "@/src/lib/time";

export const metadata = { title: "Quests · CollectorHub" };

type SearchParams = Record<string, string | string[] | undefined>;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default async function QuestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = parseListCardsQuery(await searchParams);
  const query = parsed.success ? parsed.data : listCardsQuerySchema.parse({});
  const { q, element, rarity } = query;

  await tryExpireStaleQuests();

  const session = await getSession();
  const viewerId = session?.user.id ?? null;

  const [board, mine, gold, questableCards] = await Promise.all([
    listQuestBoard(query),
    viewerId ? listMyQuests(viewerId) : Promise.resolve(null),
    viewerId ? getWalletBalance(viewerId) : Promise.resolve(0),
    viewerId ? listQuestableCards() : Promise.resolve([]),
  ]);

  const { items, total, page, pageSize, totalPages } = board;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const ownedByCardId = viewerId
    ? await getOwnedQuantities(viewerId, items.map((quest) => quest.cardId))
    : null;

  return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        Wanted
      </span>

      <div className="relative">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-extrabold">Quests</h1>
            <p className="mt-1 text-mute">
              {items.length > 0
                ? `Showing ${from}–${to} of ${total} open ${total === 1 ? "quest" : "quests"}. Cards you own appear in color.`
                : "No open quests"}
            </p>
          </div>
          {viewerId ? (
            <PostQuestDialog cards={questableCards} gold={gold} />
          ) : (
            <Link
              href="/sign-in"
              className={`flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white ${focusRing}`}
            >
              Sign in to post or accept quests
            </Link>
          )}
        </header>

        {mine && mine.accepted.length > 0 && (
          <section aria-labelledby="accepted-heading" className="mb-10">
            <h2 id="accepted-heading" className="font-display text-2xl font-bold">
              Quests you accepted
            </h2>
            <ul className="mt-5 space-y-3">
              {mine.accepted.map((quest) => {
                const enough = quest.available >= quest.quantity;
                return (
                  <li
                    key={quest.id}
                    className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[28px] bg-white px-6 py-4 shadow-soft"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold">
                        {quest.quantity}× {quest.card.name}
                      </p>
                      <p className="text-sm text-mute">
                        N°{formatCardNumber(quest.card.number)} · for{" "}
                        <Link
                          href={`/players/${quest.creator.id}`}
                          className="font-semibold underline underline-offset-2 hover:text-ink"
                        >
                          {quest.creator.name}
                        </Link>
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-semibold ${
                          enough ? "text-[#55701F]" : "text-[#B8441A]"
                        }`}
                      >
                        {enough
                          ? "You have enough to deliver"
                          : `You have ${quest.available} of ${quest.quantity} available`}
                        {quest.acceptExpiresAt &&
                          ` · ${formatTimeLeft(quest.acceptExpiresAt)} left to deliver`}
                      </p>
                    </div>
                    <p className="font-display text-xl font-bold">
                      +{quest.rewardGold.toLocaleString("en-US")}{" "}
                      <span className="text-sm font-semibold text-mute">Gold</span>
                    </p>
                    <QuestActions questId={quest.id} mode="accepter" canDeliver={enough} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {mine && mine.created.length > 0 && (
          <section aria-labelledby="created-heading" className="mb-10">
            <h2 id="created-heading" className="font-display text-2xl font-bold">
              Your quests
            </h2>
            <ul className="mt-5 space-y-3">
              {mine.created.map((quest) => (
                <li
                  key={quest.id}
                  className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[28px] bg-white px-6 py-4 shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold">
                      {quest.quantity}× {quest.card.name}
                    </p>
                    <p className="text-sm text-mute">
                      N°{formatCardNumber(quest.card.number)} ·{" "}
                      {quest.status === "ACCEPTED" && quest.accepter ? (
                        <>
                          accepted by{" "}
                          <Link
                            href={`/players/${quest.accepter.id}`}
                            className="font-semibold underline underline-offset-2 hover:text-ink"
                          >
                            {quest.accepter.name}
                          </Link>
                          {quest.acceptExpiresAt &&
                            `, ${formatTimeLeft(quest.acceptExpiresAt)} left to deliver`}
                        </>
                      ) : (
                        `open for ${formatTimeLeft(quest.expiresAt)}`
                      )}
                    </p>
                  </div>
                  <p className="font-display text-xl font-bold">
                    {quest.rewardGold.toLocaleString("en-US")}{" "}
                    <span className="text-sm font-semibold text-mute">Gold frozen</span>
                  </p>
                  {quest.status === "OPEN" ? (
                    <QuestActions questId={quest.id} mode="creator" />
                  ) : (
                    // 已经有人接单：发布人不能撤销，接单人正在为它准备
                    <p className="text-sm font-semibold text-[#7a5a10]">In progress</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <CollectionFilters q={q} element={element} rarity={rarity} basePath="/quests" />

        <div className="mt-8">
          {items.length > 0 ? (
            <>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((quest) => {
                  const isMine = quest.creatorId === viewerId;
                  return (
                    <li key={quest.id}>
                      <CardTile
                        card={quest.card}
                        owned={ownedByCardId ? (ownedByCardId.get(quest.cardId) ?? 0) : null}
                      />

                      <div className="mt-3 px-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-display text-xl font-bold">
                            {quest.rewardGold.toLocaleString("en-US")}{" "}
                            <span className="text-sm font-semibold text-mute">Gold</span>
                          </p>
                          <p className="text-sm font-semibold">Wants ×{quest.quantity}</p>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-mute">
                          <span className="shrink-0">by</span>
                          <Link
                            href={`/players/${quest.creator.id}`}
                            className="truncate font-semibold underline underline-offset-2 hover:text-ink"
                          >
                            {quest.creator.name}
                          </Link>
                          <span className="shrink-0">· {formatTimeLeft(quest.expiresAt)} left</span>
                        </p>

                        <div className="mt-3">
                          {isMine ? (
                            <p className="flex h-10 items-center justify-center rounded-full bg-paper text-sm font-semibold text-mute">
                              Your quest
                            </p>
                          ) : viewerId ? (
                            <QuestActions questId={quest.id} mode="accept" />
                          ) : (
                            <Link
                              href="/sign-in"
                              className={`flex h-10 items-center justify-center rounded-full bg-paper text-sm font-semibold hover:bg-gold-100 ${focusRing}`}
                            >
                              Sign in to accept
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-10">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  hrefFor={(p) => filtersHref("/quests", { q, element, rarity, page: p })}
                />
              </div>
            </>
          ) : (
            <div className="rounded-[28px] bg-white p-10 text-center shadow-soft">
              <h2 className="font-display text-xl font-bold">
                {total === 0 ? "No open quests here" : "That page doesn't exist"}
              </h2>
              <p className="mt-1 text-mute">
                {total === 0
                  ? "Try a different name, remove a filter, or post a quest of your own."
                  : `This list only has ${totalPages} ${totalPages === 1 ? "page" : "pages"}.`}
              </p>
              <Link
                href={total === 0 ? "/quests" : filtersHref("/quests", { q, element, rarity })}
                className={`mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white ${focusRing}`}
              >
                {total === 0 ? "Clear filters" : "Go to page 1"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}