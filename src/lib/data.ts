const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * Load year-specific data file.
 * Files follow the pattern: {dataset}-{year}.json
 */
export async function loadYearData<T>(dataset: string, year: number): Promise<T> {
  const res = await fetch(`${basePath}/data/${dataset}-${year}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load ${dataset} data for year ${year}`);
  }
  return res.json();
}

/**
 * Load static data file (not year-specific).
 */
export async function loadStaticData<T>(filename: string): Promise<T> {
  const res = await fetch(`${basePath}/data/${filename}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${filename}`);
  }
  return res.json();
}

/**
 * Generate array of years from min to max (inclusive).
 */
export function generateYearRange(minYear: number, maxYear: number): number[] {
  const years: number[] = [];
  for (let year = minYear; year <= maxYear; year++) {
    years.push(year);
  }
  return years;
}

// Year ranges for each dataset
export const YEAR_RANGES = {
  donors: { min: 2013, max: 2024, default: 2024 },
  entitySpending: { min: 2019, max: 2023, default: 2023 },
  entityRevenue: { min: 2013, max: 2024, default: 2024 },
  countryExpenses: { min: 2017, max: 2024, default: 2024 },
  sdgExpenses: { min: 2018, max: 2024, default: 2024 },
} as const;
