import { Pagination } from "@/src/components/ui/Pagination";
import { getWalletBalance } from "@/src/features/economy/economy.service";
import { CreateGuildDialog } from "@/src/features/guilds/components/CreateGuildDialog";
import { MAX_GUILD_MEMBERS } from "@/src/features/guilds/guilds.config";
import { listGuildsQuerySchema } from "@/src/features/guilds/guilds.schema";
import { getMyGuild, listGuilds } from "@/src/features/guilds/guilds.service";
import { getSession } from "@/src/lib/session";
import Link from "next/link";

export const metadata = { title: "Guilds · CollectorHub" };

type SearchParams = Record<string, string | string[] | undefined>;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const guildsHref = (q: string | undefined, page: number) => {
  const params = new URLSearchParams();
  if (q) {
    params.set("q", q);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const queryString = params.toString();
  return queryString ? `/guilds?${queryString}` : "/guilds";
};

export default async function GuildsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;

  const parsed = listGuildsQuerySchema.safeParse({
    q: first(raw.q)?.trim() || undefined,
    page: first(raw.page),
  });
  const query = parsed.success ? parsed.data : listGuildsQuerySchema.parse({});

  const session = await getSession();
  const viewerId = session?.user.id ?? null;

  const [list, myGuild, gold] = await Promise.all([
    listGuilds(query),
    viewerId ? getMyGuild(viewerId) : Promise.resolve(null),
    viewerId ? getWalletBalance(viewerId) : Promise.resolve(0),
  ]);

  return (
    <div className="relative overflow-x-clip">
      <span className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]">
        Guild
      </span>
      <div className="relative mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 ">
          <div>
            <h1 className="font-display text-4xl font-extrabold">Guilds</h1>
            <p className="mt-1 text-mute">
              {list.total} {list.total === 1 ? "guild" : "guilds"}. You can be
              in one guild at a time
            </p>
          </div>
          {viewerId && !myGuild && <CreateGuildDialog gold={gold} />}
        </header>
        {myGuild && (
          <Link
            href={`/guilds/${myGuild.guild.id}`}
            className={`mb-6 flex items-center justify-between gap-4 rounded-[28px] bg-white px-6 py-5 shadow-soft ring-2 ring-gold-500 ${focusRing}`}
          >
            <div>
              <p className="text-sm font-semibold text-mute">Your guild</p>
              <p className="font-display text-xl font-bold">
                {myGuild.guild.name}
              </p>
            </div>
            <p className="text-sm text-mute">
              {myGuild.guild._count.members}/{MAX_GUILD_MEMBERS} members
            </p>
          </Link>
        )}
        <form
          action="/guilds"
          method="get"
          role="search"
          className="flex items-center gap-2 rounded-2xl bg-white p-2 pl-5 shadow-soft"
        >
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            maxLength={50}
            placeholder="Search guilds by name"
            aria-label="Search guilds by name"
            className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-mute"
          />
          <button
            type="submit"
            className={`h-11 shrink-0 rounded-xl bg-gold-500 px-5 text-sm font-semibold text-white ${focusRing}`}
          >
            Search
          </button>
        </form>
        <div className="mt-8">
          {list.items.length > 0 ? (
            <>
              <ul className="grid gap-4 sm:grid-cols-2">
                {list.items.map((guild) => {
                  const owner = guild.members[0]?.user;
                  const full = guild._count.members >= MAX_GUILD_MEMBERS;
                  return (
                    <li key={guild.id}>
                      <Link
                        href={`/guilds/${guild.id}`}
                        className={`block h-full rounded-[28px] bg-white p-6 shadow-soft hover:bg-white/80 ${focusRing}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-display text-xl font-bold">
                            {guild.name}
                          </h2>
                          <span
                            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${
                              full
                                ? "bg-paper text-mute"
                                : "bg-gold-100 text-[#7a5a10]"
                            }`}
                          >
                            {guild._count.members}/{MAX_GUILD_MEMBERS}
                            {full && " · full"}
                          </span>
                        </div>
                        {owner && (
                          <p className="mt-1 text-sm text-mute">
                            Led by {owner.name}
                          </p>
                        )}
                        {guild.description && (
                          <p className="mt-3 line-clamp-3 text-sm text-ink/80">
                            {guild.description}
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-10">
                <Pagination
                  page={list.page}
                  totalPages={list.totalPages}
                  hrefFor={(p) => guildsHref(query.q, p)}
                />
              </div>
            </>
          ) : (
            <div className="rounded-[28px] bg-white p-10 text-center shadow-soft">
                 <h2 className="font-display text-xl font-bold">
                {query.q ? "No guilds match your search" : "No guilds yet"}
              </h2>
              <p className="mt-1 text-mute">
                {query.q ? "Try a different name." : "Be the first to create one."}
              </p>
              {query.q && (
                <Link
                  href="/guilds"
                  className={`mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white ${focusRing}`}
                >
                  Clear search
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
