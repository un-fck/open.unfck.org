"use client";

import { MousePointerClick } from "lucide-react";

interface ClickHintProps {
  text?: string;
  className?: string;
}

export function ClickHint({ text = "Click for details", className = "" }: ClickHintProps) {
  return (
    <>
      <p className={`mt-2 hidden items-center justify-center gap-1 text-sm font-medium sm:flex ${className}`} style={{ color: "var(--color-un-blue)" }}>
        <MousePointerClick className="h-3.5 w-3.5" />
        <span>{text}</span>
      </p>
      <p className={`mt-2 flex items-center justify-center gap-1 text-sm font-medium sm:hidden ${className}`} style={{ color: "var(--color-un-blue)" }}>
        <MousePointerClick className="h-3.5 w-3.5" />
        <span>Tap for details</span>
      </p>
    </>
  );
}
