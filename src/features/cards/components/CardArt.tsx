"use client";

import { useState } from "react";
import { ELEMENT_META, ElementName, formatCardNumber } from "../cards.meta";

type Props = {
  src: string;
  alt: string;
  number: number;
  element: ElementName;
};

export function CardArt({ src, alt, number, element }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-label={alt}
        role="img"
        className="font-display text-7xl font-extrabold leading-none"
        style={{
          color: "transparent",
          WebkitTextStroke: `2px ${ELEMENT_META[element].numeral}`,
        }}
      >
        {formatCardNumber(number)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-full w-full object-contain"
    />
  );
}
