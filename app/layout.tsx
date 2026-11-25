import { TopNav } from "@/src/components/layout/TopNav";
import { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import { getSession } from "@/src/lib/session";
import { getWalletBalance } from "@/src/features/economy/economy.service";
import { countIncomingTrades } from "@/src/features/trades/trades.service";
import { countUnread } from "@/src/features/notifications/notifications.service";
import { countUnreadMessages } from "@/src/features/messages/message.service";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CollectorHub",
  description: "Collect, trade and complete your card collection",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  const [gold, incomingTrades, unreadNotifications,unreadMessages] =session? await Promise.all([
    getWalletBalance(session.user.id),
    countIncomingTrades(session.user.id),
    countUnread(session.user.id),
    countUnreadMessages(session.user.id),
  ]) :([0,0,0,0])
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${figtree.variable} bg-paper font-sans text-ink antialiased`}
      >
        <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-5 sm:px-6">
          <TopNav
            user={
              session
                ? { name: session.user.name, gold, role: session.user.role, incomingTrades,unreadNotifications,unreadMessages, }
                : null
            }
          />{" "}
          <main className="mt-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
