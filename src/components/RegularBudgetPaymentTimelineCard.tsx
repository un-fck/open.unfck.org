"use client";

import { useEffect, useState } from "react";
import { RegularBudgetPaymentTimeline } from "@/components/RegularBudgetPaymentTimeline";
import { YearSlider } from "@/components/YearSlider";
import { loadYearData } from "@/lib/data";
import { useYearRanges } from "@/lib/useYearRanges";
import type { RegularBudgetContributorsData } from "@/types";

export function RegularBudgetPaymentTimelineCard() {
  const range = useYearRanges().regularBudgetContributors;
  const [selectedYear, setSelectedYear] = useState(range.default);
  const [loaded, setLoaded] = useState<RegularBudgetContributorsData | null>(
    null,
  );
  const [failedYear, setFailedYear] = useState<number | null>(null);
  const data = loaded?.meta.year === selectedYear ? loaded : null;
  const loading = data === null && failedYear !== selectedYear;

  useEffect(() => {
    let active = true;
    loadYearData<RegularBudgetContributorsData>(
      "regular-budget-contributors",
      selectedYear,
    )
      .then((payload) => {
        if (active) setLoaded(payload);
      })
      .catch((error: unknown) => {
        console.error("Failed to load regular-budget payment timeline:", error);
        if (active) setFailedYear(selectedYear);
      });
    return () => {
      active = false;
    };
  }, [selectedYear]);

  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-gray-900">
          Payment status within the year
        </h3>
        <YearSlider
          years={range.years}
          selectedYear={selectedYear}
          onChange={setSelectedYear}
          disabled={loading}
        />
      </div>
      <p className="mb-4 text-xs leading-relaxed text-gray-500">
        The curve adds a Member State&apos;s full assessment on the date it
        appears as paid in full. Partial payments are not available from the
        honour roll and are therefore not estimated.
      </p>
      {data && <RegularBudgetPaymentTimeline data={data} />}
      {loading && (
        <div className="flex h-80 items-center justify-center text-sm text-gray-500">
          Loading payment status…
        </div>
      )}
      {!loading && !data && (
        <div className="flex h-80 items-center justify-center text-sm text-red-700">
          Payment status is unavailable for {selectedYear}.
        </div>
      )}
    </section>
  );
}
