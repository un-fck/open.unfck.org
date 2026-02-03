"use client";

import { YearRangesProvider } from "@/lib/useYearRanges";

export function Providers({ children }: { children: React.ReactNode }) {
  return <YearRangesProvider>{children}</YearRangesProvider>;
}
