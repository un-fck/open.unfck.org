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
