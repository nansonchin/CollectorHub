export const formatDate=(date: Date) =>{
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
export function formatDateML(date: Date) {
  return date.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
export function formatDateSH(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}