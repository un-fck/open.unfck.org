"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface YearRange {
  years: number[];
  min: number;
  max: number;
  default: number;
  fusionYears?: number[];  // Years with secretariat sub-entity breakdown
}

interface YearRanges {
  donors: YearRange;
  entityRevenue: YearRange;
  entitySpending: YearRange & { fusionYears?: number[] };
  countryExpenses: YearRange;
  sdgExpenses: YearRange;
}

// Fallback values while manifest loads
const FALLBACK: YearRanges = {
  donors: { years: [2024], min: 2024, max: 2024, default: 2024 },
  entityRevenue: { years: [2024], min: 2024, max: 2024, default: 2024 },
  entitySpending: { years: [2023], min: 2023, max: 2023, default: 2023 },
  countryExpenses: { years: [2024], min: 2024, max: 2024, default: 2024 },
  sdgExpenses: { years: [2024], min: 2024, max: 2024, default: 2024 },
};

const YearRangesContext = createContext<YearRanges>(FALLBACK);

export function YearRangesProvider({ children }: { children: ReactNode }) {
  const [ranges, setRanges] = useState<YearRanges>(FALLBACK);

  useEffect(() => {
    fetch(`${basePath}/data/manifest.json`)
      .then((res) => res.json())
      .then((data) => setRanges(data))
      .catch((err) => console.error("Failed to load manifest:", err));
  }, []);

  return (
    <YearRangesContext.Provider value={ranges}>
      {children}
    </YearRangesContext.Provider>
  );
}

export function useYearRanges() {
  return useContext(YearRangesContext);
}

export function generateYearRange(min: number, max: number): number[] {
  const years: number[] = [];
  for (let year = min; year <= max; year++) {
    years.push(year);
  }
  return years;
}
