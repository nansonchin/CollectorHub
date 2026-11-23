import { ResolveReportForm } from "@/src/features/moderation/components/ResolveReportForm";
import { UnbanButton } from "@/src/features/moderation/components/UnbanButton";
import { REPORT_REASON_LABELS, ReportReasonId, ResolveActionId } from "@/src/features/moderation/moderation.config";
import { listBannedUsers, listOpenReports, listRecentActions, TargetSummary } from "@/src/features/moderation/moderation.service";
import { Stars } from "@/src/features/reviews/components/Stars";
import { isAdmin, isStaff } from "@/src/lib/authz";
import { formatDate } from "@/src/lib/date";
import { getSession } from "@/src/lib/session";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const metadata = { title: "Moderation · CollectorHub" };

const ACTION_LABELS: Record<string, string> = {
  DISMISS_REPORT: "dismissed a report",
  REMOVE_LISTING: "removed a listing",
  HIDE_REVIEW: "hid a review",
  WARN_USER: "warned",
  BAN_USER: "banned",
  UNBAN_USER: "unbanned",
};

function TargetBlock({ target }: { target: TargetSummary }) {
  if (target.kind === "LISTING") {
    return (
      <p>
        <span className="font-semibold">Listing:</span>
        {target.cardName}
        {target.quantity > 1 && ` ×${target.quantity}`} at{" "}
        {target.unitPrice.toLocaleString("en-US")} Gold each{" "}
        <span className="rounded-md bg-paper px-2 py-0.5 text-xs font-bold">
          {target.status}
        </span>
      </p>
    );
  }
  if (target.kind === "REVIEW") {
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-2">
          <span className="font-semibold">Review:</span>{" "}
          <Stars value={target.rating} />
          {target.hidden && (
            <span className="rounded-md bg-paper px-2 py-0.5 text-xs font-bold">
              HIDDEN
            </span>
          )}
        </p>
        {target.comment && (
          <p className="whitespace-pre-line rounded-xl bg-paper px-4 py-3 text-ink/80">
            {target.comment}
          </p>
        )}
      </div>
    );
  }
  if (target.kind === "USER")
    return <p className="font-semibold">Player profile</p>;
  return <p className="text-mute">The reported item no longer exists.</p>;
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!isStaff(session.user.role)) notFound();
  const viewer = session.user;
  const viewerIsAdmin = isAdmin(viewer.role);
  const [reports, banned, actions] = await Promise.all([
    listOpenReports(),
    viewerIsAdmin ? listBannedUsers() : Promise.resolve([]),
    listRecentActions(),
  ]);

   return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        Staff
      </span>

      <div className="relative mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-extrabold">Moderation</h1>
          <p className="mt-1 text-mute">
            Signed in as {viewer.role === "ADMIN" ? "an admin" : "a moderator"}.{" "}
            {reports.length} open {reports.length === 1 ? "report" : "reports"}.
          </p>
        </header>

        <section aria-labelledby="reports-heading">
          <h2 id="reports-heading" className="font-display text-2xl font-bold">
            Open reports
          </h2>

          {reports.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {reports.map((report) => {
                const { target, targetUser } = report;
                const canActOnUser = targetUser.role !== "ADMIN" && targetUser.id !== viewer.id;

                const actions: ResolveActionId[] = ["DISMISS"];
                if (
                  target.kind === "LISTING" &&
                  (target.status === "AVAILABLE" || target.status === "RESERVED")
                ) {
                  actions.push("REMOVE_LISTING");
                }
                if (target.kind === "REVIEW" && !target.hidden) actions.push("HIDE_REVIEW");
                if (canActOnUser) actions.push("WARN_USER");
                if (canActOnUser && viewerIsAdmin && !targetUser.bannedAt) {
                  actions.push("BAN_USER");
                }

                return (
                  <li key={report.id} className="space-y-4 rounded-[28px] bg-white p-6 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-[#FFE3D6] px-2.5 py-1 text-xs font-bold text-[#B8441A]">
                        {REPORT_REASON_LABELS[report.reason as ReportReasonId]}
                      </span>
                      <p className="text-sm text-mute">
                        Reported by {report.reporter.name} · {formatDate(report.createdAt)}
                      </p>
                    </div>

                    <TargetBlock target={target} />

                    {report.details && (
                      <p className="whitespace-pre-line rounded-xl bg-paper px-4 py-3 text-sm text-ink/80">
                        {report.details}
                      </p>
                    )}

                    <p className="text-sm text-mute">
                      Player:{" "}
                      <Link
                        href={`/players/${targetUser.id}`}
                        className="font-semibold text-ink underline underline-offset-2"
                      >
                        {targetUser.name}
                      </Link>{" "}
                      · {targetUser.role.toLowerCase()} · {report.totalAgainstUser}{" "}
                      {report.totalAgainstUser === 1 ? "report" : "reports"} in total
                      {targetUser.bannedAt && " · banned"}
                    </p>

                    <ResolveReportForm reportId={report.id} actions={actions} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 rounded-[28px] bg-white p-8 text-center text-mute shadow-soft">
              The queue is empty. Nice work.
            </p>
          )}
        </section>

        {viewerIsAdmin && banned.length > 0 && (
          <section aria-labelledby="banned-heading" className="mt-12">
            <h2 id="banned-heading" className="font-display text-2xl font-bold">
              Banned players
            </h2>
            <ul className="mt-5 space-y-3">
              {banned.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[28px] bg-white px-6 py-4 shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-mute">
                      {user.bannedAt && formatDate(user.bannedAt)}
                      {user.banReason && ` · ${user.banReason}`}
                    </p>
                  </div>
                  <UnbanButton userId={user.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="log-heading" className="mt-12">
          <h2 id="log-heading" className="font-display text-2xl font-bold">
            Recent actions
          </h2>
          {actions.length > 0 ? (
            <ul className="mt-5 divide-y divide-ink/10 rounded-[28px] bg-white px-6 shadow-soft">
              {actions.map((action) => (
                <li key={action.id} className="py-4 text-sm">
                  <p>
                    <span className="font-semibold">{action.admin.name}</span>{" "}
                    {ACTION_LABELS[action.type] ?? action.type}
                    {action.targetUser && (
                      <>
                        {" "}
                        <span className="font-semibold">{action.targetUser.name}</span>
                      </>
                    )}
                    <span className="text-mute"> · {formatDate(action.createdAt)}</span>
                  </p>
                  {action.message && (
                    <p className="mt-1 text-mute">Message: {action.message}</p>
                  )}
                  {action.note && <p className="mt-1 text-mute">Note: {action.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-mute">No actions yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
