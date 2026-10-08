"use client";

import { useEffect, useRef } from "react";

// Fait défiler la conversation vers le dernier message à l'ouverture.
export default function AncreBas() {
  const ancre = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ancre.current?.scrollIntoView({ block: "end" });
  }, []);
  return <div ref={ancre} aria-hidden="true" />;
}
