import { GuildActions } from "@/src/features/guilds/components/GuildActions";
import { GuildEditor } from "@/src/features/guilds/components/GuildEditor";
import { MemberActions } from "@/src/features/guilds/components/MemberActions";
import { RequestActions } from "@/src/features/guilds/components/RequestActions";
import { MAX_GUILD_MEMBERS } from "@/src/features/guilds/guilds.config";
import {
  canEditAnnouncement,
  canEditProfile,
  canKick,
  canManageRoles,
  canReviewRequests,
  ROLE_LABELS,
} from "@/src/features/guilds/guilds.permissions";
import { MemberAction } from "@/src/features/guilds/guilds.schema";
import { getGuildDetail } from "@/src/features/guilds/guilds.service";
import { formatDate, formatDateSH } from "@/src/lib/date";
import { getSession } from "@/src/lib/session";
import { formatTimeAgo } from "@/src/lib/time";
import { request } from "http";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const ROLE_STYLE = {
  OWNER: "bg-gold-500 text-white",
  MODERATOR: "bg-gold-100 text-[#7a5a10]",
  MEMBER: "bg-paper text-mute",
} as const;

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const detail = await getGuildDetail(id, null);
  return {
    title: detail ? `${detail.guild.name} · CollectorHub` : "Guild not found",
  };
}

export default async function GuildPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  const viewerId = session?.user.id ?? null;

  const detail = await getGuildDetail(id, viewerId);

  if (!detail) {
    notFound();
  }
  const { guild, members, requests, viewerRole, hasRequested, inOtherGuild } =
    detail;
  const isFull = members.length >= MAX_GUILD_MEMBERS;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/guilds"
            className={`text-sm font-semibold text-mute underline underline-offset-4 hover:text-ink ${focusRing}`}
          >
            All guilds
          </Link>
          <h1 className="mt-1 font-display text-4xl font-extrabold">
            {guild.name}
          </h1>
          <p className="mt-1 text-mute">
            {members.length}/{MAX_GUILD_MEMBERS} members · founded{" "}
            {formatDateSH(guild.createdAt)}
          </p>
        </div>
        <div>
          {!viewerId ? (
            <Link
              href="/sign-in"
              className={`flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white ${focusRing}`}
            >
              Sign in to join
            </Link>
          ) : viewerRole === "OWNER" ? (
            <GuildActions
              guildId={guild.id}
              guildName={guild.name}
              mode="disband"
            />
          ) : viewerRole ? (
            <GuildActions
              guildId={guild.id}
              guildName={guild.name}
              mode="leave"
            />
          ) : hasRequested ? (
            <GuildActions
              guildId={guild.id}
              guildName={guild.name}
              mode="cancel-request"
            />
          ) : inOtherGuild ? (
            <p className="max-w-56 text-sm text-mute">
              You are already in another guild.
            </p>
          ) : isFull ? (
            <p className="rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-mute">
              Guild is full
            </p>
          ) : (
            <GuildActions
              guildId={guild.id}
              guildName={guild.name}
              mode="request"
            />
          )}
        </div>
      </header>
      {viewerRole === "OWNER" && (
        <p className="mb-6 rounded-2xl bg-gold-100 px-5 py-3 text-sm text-[#7a5a10]">
          You are the owner. To leave, make another member the owner first, or
          disband the guild.
        </p>
      )}
      {guild.description && (
        <p className="mb-6 whitespace-pre-line text-ink/80">
          {guild.description}
        </p>
      )}
      {guild.announcement && (
        <section
          aria-label="Announcement"
          className="mb-6 rounded-[28px] bg-white px-6 py-5 shadow-soft ring-2 ring-gold-500"
        >
          <p className="text-sm font-semibold text-mute">
            Announcement{" "}
            {guild.announcementUpdatedAt &&
              ` · ${formatTimeAgo(guild.announcementUpdatedAt)}`}
          </p>
          <p className="mt-1 whitespace-pre-line">{guild.announcement}</p>
        </section>
      )}
      {viewerRole &&
        (canEditProfile(viewerRole) || canEditAnnouncement(viewerRole)) && (
          <div className="mb-8">
            <GuildEditor
              guildId={guild.id}
              description={guild.description ?? ""}
              announcement={guild.announcement ?? ""}
              canEditProfile={canEditProfile(viewerRole)}
              canEditAnnouncement={canEditAnnouncement(viewerRole)}
            />
          </div>
        )}
      {viewerRole && canReviewRequests(viewerRole) && requests.length > 0 && (
        <section aria-labelledby="requests-heading" className="mb-8">
          <h2 id="requests-heading" className="font-display text-2xl font-bold">
            Join requests
          </h2>
          <ul className="mt-4 space-y-3">
            {requests.map((request) => (
              <li
                key={request.userId}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[28px] bg-white px-6 py-4 shadow-soft"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/players/${request.userId}`}
                    className="font-semibold underline underline-offset-2 hover:text-ink"
                  >
                    {request.name}
                  </Link>
                  <span className="text-sm text-mute">
                    {" "}
                    · {formatTimeAgo(request.createdAt)}
                  </span>
                  {request.message && (
                    <p className="mt-0.5 whitespace-pre-line text-sm text-ink/80">
                      &ldquo;{request.message}&rdquo;
                    </p>
                  )}
                </div>
                <RequestActions guildId={guild.id} userId={request.userId} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="members-heading">
        <h2 id="members-heading" className="font-display text-2xl font-bold">
          Members
        </h2>
        <ul className="mt-4 divide-y divide-ink/10 rounded-[28px] bg-white px-6 shadow-soft">
          {members.map((member) => {
            const actions: MemberAction[] = [];
            if (viewerRole && member.userId !== viewerId) {
              if (canKick(viewerRole, member.role)) actions.push("kick");
              if (canManageRoles(viewerRole) && member.role !== "OWNER") {
                actions.push(member.role === "MEMBER" ? "promote" : "demote");
                actions.push("transfer");
              }
            }

            return (
              <li
                key={member.userId}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/players/${member.userId}`}
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    {member.name}
                  </Link>
                  <span className="text-sm text-mute">
                    {" "}
                    · joined {formatDate(member.joinedAt)}
                  </span>
                </div>
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-bold ${ROLE_STYLE[member.role]}`}
                >
                  {ROLE_LABELS[member.role]}
                </span>
                <MemberActions
                  guildId={guild.id}
                  targetId={member.userId}
                  targetName={member.name}
                  actions={actions}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
