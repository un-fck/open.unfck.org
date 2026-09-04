"use client";

import { useEffect, useMemo, useState } from "react";
import { FinancingInstrumentChart } from "@/components/charts/FinancingInstrumentChart";
import { loadYearData } from "@/lib/data";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  RegularBudgetContributorsData,
  RegularBudgetPaymentStatus,
} from "@/types";

const STATUS_SERIES: Array<{
  key: RegularBudgetPaymentStatus;
  label: string;
  color: string;
}> = [
  {
    key: "paid_on_time",
    label: "Paid in full on time",
    color: "#004987",
  },
  {
    key: "paid_late",
    label: "Paid in full after due date",
    color: "#66C6E8",
  },
  {
    key: "not_paid_in_full",
    label: "Not listed as paid in full",
    color: "#EAF7FB",
  },
];

function coversFullCalendarYear(row: RegularBudgetContributorsData): boolean {
  const coverageEnd = Date.parse(`${row.meta.as_of}T00:00:00Z`);
  const yearEnd = Date.UTC(row.meta.year, 11, 31);
  return Number.isFinite(coverageEnd) && coverageEnd >= yearEnd;
}

function completedRows(
  rows: RegularBudgetContributorsData[],
): RegularBudgetContributorsData[] {
  const latestYear = Math.max(...rows.map((row) => row.meta.year));
  return rows.filter(
    (row) => row.meta.year !== latestYear || coversFullCalendarYear(row),
  );
}

export function RegularBudgetPaymentStatusTrends() {
  const years = useYearRanges().regularBudgetContributors.years;
  const [rows, setRows] = useState<RegularBudgetContributorsData[] | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    Promise.all(
      years.map((year) =>
        loadYearData<RegularBudgetContributorsData>(
          "regular-budget-contributors",
          year,
        ),
      ),
    )
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((error: unknown) => {
        console.error("Failed to load regular-budget payment trends:", error);
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, [years]);

  const chartData = useMemo(() => {
    if (!rows) return [];
    return completedRows(rows).map((row) => {
      const amounts: Record<RegularBudgetPaymentStatus, number> = {
        paid_on_time: 0,
        paid_late: 0,
        not_paid_in_full: 0,
      };
      for (const contributor of row.contributors) {
        amounts[contributor.payment_status] += contributor.assessment_amount;
      }
      return {
        year: String(row.meta.year),
        ...amounts,
      };
    });
  }, [rows]);

  if (rows === null) {
    return (
      <section className="min-w-0">
        <h3 className="mb-3 text-lg font-medium text-gray-900">
          Payment status over the years
        </h3>
        <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
          Loading payment status…
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0">
      <h3 className="mb-3 text-lg font-medium text-gray-900">
        Payment status over the years
      </h3>
      <p className="mb-4 text-xs leading-relaxed text-gray-500">
        Stacked area is assessed dollars in each annual honour-roll snapshot.
        An incomplete latest year is omitted.
      </p>
      {chartData.length > 0 ? (
        <FinancingInstrumentChart data={chartData} series={STATUS_SERIES} />
      ) : (
        <div className="flex h-[280px] items-center justify-center text-center text-sm text-gray-500">
          No complete calendar years are available.
        </div>
      )}
    </section>
  );
}
