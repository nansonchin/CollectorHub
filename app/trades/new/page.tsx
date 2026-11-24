import { getWalletBalance } from "@/src/features/economy/economy.service";
import { TradeBuilder } from "@/src/features/trades/components/TradeBuilder";
import { getTradeBuilderData } from "@/src/features/trades/trades.service";
import { getSession } from "@/src/lib/session";
import { notFound, redirect } from "next/navigation";

export const metadata = { title: "New trade · CollectorHub" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewTradePage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { to } = await searchParams;
  const otherId = Array.isArray(to) ? to[0] : to;

  if (!otherId) notFound();
  const data = await getTradeBuilderData(session.user.id, otherId);
  if (!data) notFound();
  const myGold = await getWalletBalance(session.user.id);

     return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-extrabold">
          Trade with {data.other.name}
        </h1>
        <p className="mt-1 text-mute">Choose what you give and what you want in return.</p>
      </header>

      <TradeBuilder
        recipient={data.other}
        myCards={data.myCards}
        theirCards={data.theirCards}
        myGold={myGold}
      />
    </div>
     )
}
