import { formatCardNumber } from "@/src/features/cards/cards.meta";
import { listMyOrders } from "@/src/features/market/market.service";
import { ReviewDialog } from "@/src/features/reviews/components/ReviewDialog";
import { Stars } from "@/src/features/reviews/components/Stars";
import { formatDateSH } from "@/src/lib/date";
import { getSession } from "@/src/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Orders · CollectorHub" };


export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const userId = session.user.id;
  const orders = await listMyOrders(userId);

  return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        Deals
      </span>

      <div className="relative">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-extrabold">Orders</h1>
          <p className="mt-1 text-mute">
            {orders.length > 0
              ? "Your completed trades. Leave a review to help other players."
              : "Your completed trades will appear here."}
          </p>
        </header>

        {orders.length > 0 ? (
          <ul className="space-y-3">
            {orders.map((order) => {
              const bought = order.buyerId === userId;
              const counterpart = bought ? order.seller : order.buyer;
              const myReview = order.reviews[0];

              const amount = bought ? order.totalPrice : order.totalPrice - order.fee;

              return (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[28px] bg-white px-6 py-4 shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold">
                      {order.card.name}
                      {order.quantity > 1 && ` ×${order.quantity}`}
                    </p>
                    <p className="text-sm text-mute">
                      N°{formatCardNumber(order.card.number)} ·{" "}
                      {bought ? "Bought from" : "Sold to"}{" "}
                      <Link
                        href={`/players/${counterpart.id}`}
                        className="font-semibold underline underline-offset-2 hover:text-ink"
                      >
                        {counterpart.name}
                      </Link>{" "}
                      · {formatDateSH(order.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-display text-xl font-bold ${
                        bought ? "text-[#B8441A]" : "text-[#55701F]"
                      }`}
                    >
                      {bought ? "−" : "+"}
                      {amount.toLocaleString("en-US")}{" "}
                      <span className="text-sm font-semibold text-mute">Gold</span>
                    </p>
                    {!bought && order.fee > 0 && (
                      <p className="text-xs text-mute">after {order.fee} fee</p>
                    )}
                  </div>

                  <div className="flex w-full justify-end sm:w-44">
                    {myReview ? (
                      <div className="text-right">
                        <Stars value={myReview.rating} />
                        <p className="text-xs text-mute">Your review</p>
                      </div>
                    ) : (
                      <ReviewDialog
                        orderId={order.id}
                        cardName={order.card.name}
                        counterpartName={counterpart.name}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-soft">
            <h2 className="font-display text-xl font-bold">No orders yet</h2>
            <p className="mt-1 text-mute">Buy or sell a card on the market to get started.</p>
            <Link
              href="/market"
              className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Open market
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}