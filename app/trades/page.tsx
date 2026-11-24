import { TradeActions } from "@/src/features/trades/components/TradeActions";
import { listMyTrades, tryExpireStaleTime } from "@/src/features/trades/trades.service";
import { formatDateMD } from "@/src/lib/date";
import { getSession } from "@/src/lib/session";
import { formatTimeLeft } from "@/src/lib/time";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Trades · CollectorHub" };

type TradeRow = Awaited<ReturnType<typeof listMyTrades>>["incoming"][number];

const STATUS_STYLE = {
  PENDING: { label: "Pending", className: "bg-gold-100 text-[#7a5a10]" },
  COMPLETED: { label: "Completed", className: "bg-[#E4EDCB] text-[#55701F]" },
  REJECTED: { label: "Declined", className: "bg-[#FFE3D6] text-[#B8441A]" },
  CANCELLED: { label: "Cancelled", className: "bg-paper text-mute" },
  EXPIRED: { label: "Expired", className: "bg-paper text-mute" },
} as const;

function describeSide(items: TradeRow["items"], gold: number) {
  const parts = items.map((item) => `${item.quantity} × ${item.card.name}`);
  if (gold > 0) {
    if (gold > 0) parts.push(`${gold.toLocaleString("en-US")} Gold`);
  }
  return parts.length > 0 ? parts.join(", ") : "Nothing";
}

function TradeCard({ trade, viewerId }: { trade: TradeRow; viewerId: string }) {
  const iAMProposer = trade.proposerId === viewerId;
  const counterpart = iAMProposer ? trade.recipient : trade.proposer;

  const offered = trade.items.filter((item) => item.side === "OFFER");
  const requested = trade.items.filter((item) => item.side === "REQUEST");

  const iGive = iAMProposer
    ? describeSide(offered, trade.offeredGold)
    : describeSide(requested, trade.requestedGold);
  const iGet = iAMProposer
    ? describeSide(requested, trade.requestedGold)
    : describeSide(offered, trade.offeredGold);

    const status = STATUS_STYLE[trade.status]

    return (
    <li className="space-y-4 rounded-[28px] bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-mute">
          {iAMProposer ? "You offered to" : "Offer from"}{" "}
          <Link
            href={`/players/${counterpart.id}`}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {counterpart.name}
          </Link>{" "}
          · {formatDateMD(trade.createdAt)}
        </p>
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-paper px-4 py-3">
          <p className="text-xs font-semibold text-mute">You give</p>
          <p className="mt-1 text-sm font-semibold">{iGive}</p>
        </div>
        <div className="rounded-2xl bg-paper px-4 py-3">
          <p className="text-xs font-semibold text-mute">You get</p>
          <p className="mt-1 text-sm font-semibold">{iGet}</p>
        </div>
      </div>

      {trade.message && (
        <p className="whitespace-pre-line text-sm text-ink/80">&ldquo;{trade.message}&rdquo;</p>
      )}

      {trade.status === "PENDING" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#7a5a10]">
            {formatTimeLeft(trade.expiresAt)} left
          </p>
          <TradeActions tradeId={trade.id} mode={iAMProposer ? "outgoing" : "incoming"} />
        </div>
      )}
    </li>
  );
}

export default async function TradePages(){
    const session = await getSession()
    if(!session){
        redirect("/sign-in")
    }
    await tryExpireStaleTime()

    const viewerId= session.user.id;
      const { incoming, outgoing, history } = await listMyTrades(viewerId);

  return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        Swap
      </span>

      <div className="relative mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-extrabold">Trades</h1>
          <p className="mt-1 text-mute">
            To start a trade, open a player&apos;s profile and choose &ldquo;Propose a trade&rdquo;.
          </p>
        </header>

        <section aria-labelledby="incoming-heading">
          <h2 id="incoming-heading" className="font-display text-2xl font-bold">
            Offers for you
          </h2>
          {incoming.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {incoming.map((trade) => (
                <TradeCard key={trade.id} trade={trade} viewerId={viewerId} />
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-mute">No one is waiting for your answer.</p>
          )}
        </section>

        <section aria-labelledby="outgoing-heading" className="mt-12">
          <h2 id="outgoing-heading" className="font-display text-2xl font-bold">
            Your offers
          </h2>
          {outgoing.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {outgoing.map((trade) => (
                <TradeCard key={trade.id} trade={trade} viewerId={viewerId} />
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-mute">You have no open offers.</p>
          )}
        </section>

        {history.length > 0 && (
          <section aria-labelledby="history-heading" className="mt-12">
            <h2 id="history-heading" className="font-display text-2xl font-bold">
              History
            </h2>
            <ul className="mt-5 space-y-4">
              {history.map((trade) => (
                <TradeCard key={trade.id} trade={trade} viewerId={viewerId} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
