export function formatTimeLeft(until: Date, now: Date = new Date()) {
  const ms = until.getTime() - now.getTime();
  if (ms <= 0) {
    return "expired";
  }

  const minutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatTimeAgo(date: Date, now: Date = new Date()) {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
