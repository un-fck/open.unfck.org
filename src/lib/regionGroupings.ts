// Centralized region grouping configuration
// Defines visual styling and metadata for each CEB region used in the country treemap

export interface RegionStyle {
  bgColor: string;
  textColor: string;
  order: number;
  label: string;
}

export const regionStyles: Record<string, RegionStyle> = {
  Africa: {
    label: "Africa",
    bgColor: "bg-camouflage-green",
    textColor: "text-white",
    order: 1,
  },
  Asia: {
    label: "Asia",
    bgColor: "bg-au-chico",
    textColor: "text-white",
    order: 2,
  },
  Americas: {
    label: "Americas",
    bgColor: "bg-smoky",
    textColor: "text-white",
    order: 3,
  },
  Europe: {
    label: "Europe",
    bgColor: "bg-shuttle-gray",
    textColor: "text-white",
    order: 4,
  },
  Oceania: {
    label: "Oceania",
    bgColor: "bg-trout",
    textColor: "text-white",
    order: 5,
  },
  "Global and Interregional": {
    label: "Global",
    bgColor: "bg-gray-500",
    textColor: "text-white",
    order: 6,
  },
};

/**
 * Get style configuration for a region
 * Falls back to default gray styling if region is not found
 */
export function getRegionStyle(region: string): RegionStyle {
  return (
    regionStyles[region] || {
      bgColor: "bg-gray-400",
      textColor: "text-white",
      order: 999,
      label: region,
    }
  );
}

/**
 * Get all regions sorted by their order
 */
export function getSortedRegions(): Array<[string, RegionStyle]> {
  return Object.entries(regionStyles).sort(([, a], [, b]) => a.order - b.order);
}
