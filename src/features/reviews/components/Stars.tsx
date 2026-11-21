import { Star } from "lucide-react";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const filled = Math.round(value);

  return (
    <span
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
      className="inline-flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          aria-hidden
          className={i < filled ? "text-gold-500" : "text-ink/15"}
          fill="currentColor"
          strokeWidth={0}
        />
      ))}
    </span>
  );
}
