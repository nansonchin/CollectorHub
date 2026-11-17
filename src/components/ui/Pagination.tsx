import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
};

function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];

  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) {
      result.push("gap");
    }
    result.push(p);
  });

  return result;
}

const itemBase =
  "grid size-10 place-items-center rounded-full text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function Pagination({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1.5"
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          aria-label="Previous page"
          className={`${itemBase} bg-white shadow-soft hover:bg-gold-100`}
        >
          <ChevronLeft size={18} aria-hidden />
        </Link>
      ) : (
        <span aria-hidden className={`${itemBase} text-mute/40`}>
          <ChevronLeft size={18} />
        </span>
      )}
      {pageWindow(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-mute">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={`${itemBase} ${
              item === page
                ? "bg-ink text-white"
                : "bg-white shadow-soft hover:bg-gold-100"
            }`}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          aria-label="Next page"
          className={`${itemBase} bg-white shadow-soft hover:bg-gold-100`}
        >
          <ChevronRight size={18} aria-hidden />
        </Link>
      ) : (
        <span aria-hidden className={`${itemBase} text-mute/40`}>
          <ChevronRight size={18} />
        </span>
      )}
    </nav>
  );
}
