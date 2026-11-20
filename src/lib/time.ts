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
