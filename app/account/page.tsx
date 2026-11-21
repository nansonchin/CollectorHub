import { SignOutButton } from "@/src/features/auth/components/SignOutButton";
import { getSession } from "@/src/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Account · CollectorHub" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { user } = session;
  const memberSince = new Date(user.createdAt).toLocaleDateString("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
   return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-4xl font-extrabold">Account</h1>

      <div className="mt-6 rounded-[32px] bg-white p-8 shadow-soft">
        <dl className="space-y-5">
          <div>
            <dt className="text-sm font-semibold text-mute">Name</dt>
            <dd className="mt-0.5 font-display text-xl font-bold">{user.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-mute">Email</dt>
            <dd className="mt-0.5">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-mute">Member since</dt>
            <dd className="mt-0.5">{memberSince}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <SignOutButton />
          <Link
            href={`/players/${user.id}`}
            className="text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            View my public profile
          </Link>
        </div>
      </div>
    </div>
  );
}
