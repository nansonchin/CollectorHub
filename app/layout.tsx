import { TopNav } from "@/src/components/layout/TopNav";
import { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CollectorHub",
  description: "Collect, trade and complete your card collection",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${figtree.variable} bg-paper font-sans text-ink antialiased`}
      >
        <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-5 sm:px-6">
          <TopNav />
          <main className="mt-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
