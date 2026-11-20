import { LEDGER_LABELS, LedgerTypeName } from "@/src/features/economy/economy.labels";
import { getWalletBalance, listRecentLedger } from "@/src/features/economy/economy.service";
import { CheckoutDialog } from "@/src/features/payments/components/CheckoutDialog";
import { GOLD_PACK_IDS, GOLD_PACKS } from "@/src/features/payments/payments.config";
import { formatUsd } from "@/src/features/payments/payments.format";
import { listRecentPayments } from "@/src/features/payments/payments.service";
import { getSession } from "@/src/lib/session";
import { redirect } from "next/navigation";


export const metadata = { title: "Wallet · CollectorHub" };

const PAYMENT_STATUS_STYLE = {
  SUCCEEDED: { label: "Succeeded", className: "bg-[#E4EDCB] text-[#55701F]" },
  FAILED: { label: "Failed", className: "bg-[#FFE3D6] text-[#B8441A]" },
  PENDING: { label: "Pending", className: "bg-gold-100 text-[#7a5a10]" },
} as const;

function formatDate(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function WalletPage() {

  const session = await getSession();
  if (!session) redirect("/sign-in");

  const userId = session.user.id;
  const [balance, ledger, payments] = await Promise.all([
    getWalletBalance(userId),
    listRecentLedger(userId),
    listRecentPayments(userId),
  ]);

  return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        Gold
      </span>

      <div className="relative">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-extrabold">Wallet</h1>
        </header>

        <section
          aria-label="Balance"
          className="rounded-[32px] bg-white p-6 shadow-soft sm:p-8"
        >
          <p className="text-sm font-semibold text-mute">Your Gold</p>
          <p className="mt-1 font-display text-5xl font-extrabold leading-none">
            {balance.toLocaleString("en-US")}
          </p>
        </section>

        <section aria-labelledby="topup-heading" className="mt-10">
          <h2 id="topup-heading" className="font-display text-2xl font-bold">
            Top up
          </h2>
          <p className="mt-1 rounded-2xl bg-gold-100 px-4 py-3 text-sm text-[#7a5a10]">
            Test mode. Payments are simulated and no real money is ever charged.
          </p>

          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {GOLD_PACK_IDS.map((id) => {
              const pack = GOLD_PACKS[id];
              return (
                <li key={id} className="overflow-hidden rounded-[28px] bg-white shadow-soft">
                  <div className="relative h-24 overflow-hidden bg-linear-to-b from-gold-100 to-gold-200">
                    <div
                      aria-hidden
                      className="absolute left-1/2 top-2 flex -translate-x-1/2 gap-1.5"
                    >
                      <span className="block h-24 w-10 -skew-x-12 bg-gold-400" />
                      <span className="block h-24 w-4 -skew-x-12 bg-ink" />
                    </div>
                  </div>
                  <div className="space-y-3 p-5">
                    <div>
                      <h3 className="font-display text-lg font-bold">{pack.label}</h3>
                      <p className="font-display text-3xl font-extrabold">
                        {pack.gold.toLocaleString("en-US")}{" "}
                        <span className="text-base font-semibold text-mute">Gold</span>
                      </p>
                      <p className="text-sm text-mute">{formatUsd(pack.priceCents)}</p>
                    </div>
                    <CheckoutDialog pack={{ id, ...pack }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {payments.length > 0 && (
          <section aria-labelledby="payments-heading" className="mt-10">
            <h2 id="payments-heading" className="font-display text-2xl font-bold">
              Recent payments
            </h2>
            <ul className="mt-5 space-y-3">
              {payments.map((payment) => {
                const status = PAYMENT_STATUS_STYLE[payment.status];
                const pack = GOLD_PACKS[payment.packId as keyof typeof GOLD_PACKS];
                return (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[28px] bg-white px-6 py-4 shadow-soft"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {pack?.label ?? payment.packId} · {payment.gold.toLocaleString("en-US")}{" "}
                        Gold
                      </p>
                      <p className="text-sm text-mute">
                        {formatDate(payment.createdAt)} · {formatUsd(payment.amountCents)}
                        {payment.failureReason && ` · ${payment.failureReason}`}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-bold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-labelledby="history-heading" className="mt-10">
          <h2 id="history-heading" className="font-display text-2xl font-bold">
            Gold history
          </h2>
          {ledger.length > 0 ? (
            <ul className="mt-5 divide-y divide-ink/10 rounded-[28px] bg-white px-6 shadow-soft">
              {ledger.map((entry) => (
                <li key={entry.id} className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {LEDGER_LABELS[entry.type as LedgerTypeName] ?? entry.type}
                    </p>
                    <p className="text-sm text-mute">{formatDate(entry.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-display text-lg font-bold ${
                        entry.amount > 0 ? "text-[#55701F]" : "text-[#B8441A]"
                      }`}
                    >
                      {entry.amount > 0 ? "+" : "−"}
                      {Math.abs(entry.amount).toLocaleString("en-US")}
                    </p>
                    <p className="text-xs text-mute">
                      Balance {entry.balanceAfter.toLocaleString("en-US")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-mute">No Gold activity yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}