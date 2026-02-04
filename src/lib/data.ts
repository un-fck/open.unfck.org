const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export async function loadYearData<T>(dataset: string, year: number): Promise<T> {
  const res = await fetch(`${basePath}/data/${dataset}-${year}.json`);
  if (!res.ok) throw new Error(`Failed to load ${dataset} data for year ${year}`);
  return res.json();
}

export async function loadStaticData<T>(filename: string): Promise<T> {
  const res = await fetch(`${basePath}/data/${filename}`);
  if (!res.ok) throw new Error(`Failed to load ${filename}`);
  return res.json();
}

// UNINFO Cooperation Framework types
export interface UninfoMetrics {
  required: number;
  available: number;
  spent: number;
}

export interface UninfoProject {
  id: number;
  agency: string;
  sdg: number | null;
  code: string;
  name: string;
  description: string | null;
  start: string | null;
  end: string | null;
  outcome: string | null;
  required: number;
  available: number;
  spent: number;
}

// Full country data (loaded per-country)
export interface UninfoCountryFull {
  workspace_id: number;
  name: string;
  totals: UninfoMetrics;
  sdgs: Record<string, UninfoMetrics>;
  projects: UninfoProject[];
}

// Index entry (for quick lookups)
export interface UninfoCountryIndex {
  workspace_id: number;
  name: string;
  totals: UninfoMetrics;
  project_count: number;
}

export interface UninfoSdgData {
  name: string;
  totals: UninfoMetrics;
  countries: Record<string, UninfoMetrics>;
  top_underfunded: string[];
}

// Caches
let uninfoCountryIndexCache: Record<string, UninfoCountryIndex> | null = null;
const uninfoCountryCache: Record<string, UninfoCountryFull> = {};
let uninfoSdgsCache: Record<string, UninfoSdgData> | null = null;

export async function loadUninfoCountryIndex(): Promise<Record<string, UninfoCountryIndex>> {
  if (uninfoCountryIndexCache) return uninfoCountryIndexCache;
  uninfoCountryIndexCache = await loadStaticData<Record<string, UninfoCountryIndex>>("uninfo-countries-index.json");
  return uninfoCountryIndexCache;
}

export async function loadUninfoCountry(iso3: string): Promise<UninfoCountryFull | null> {
  if (uninfoCountryCache[iso3]) return uninfoCountryCache[iso3];
  try {
    const data = await loadStaticData<UninfoCountryFull>(`uninfo-countries/${iso3}.json`);
    uninfoCountryCache[iso3] = data;
    return data;
  } catch {
    return null;
  }
}

export async function loadUninfoSdgs(): Promise<Record<string, UninfoSdgData>> {
  if (uninfoSdgsCache) return uninfoSdgsCache;
  uninfoSdgsCache = await loadStaticData<Record<string, UninfoSdgData>>("uninfo-sdgs.json");
  return uninfoSdgsCache;
}
