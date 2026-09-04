import organizationTaxonomies from "../../data/organization-taxonomies.json";

// Centralized region grouping configuration
// Defines visual styling and metadata for each CEB region used in the country treemap

export interface RegionStyle {
  bgColor: string;
  textColor: string;
  color: string;
  order: number;
  label: string;
}

const regionVisuals: Record<
  string,
  Pick<RegionStyle, "bgColor" | "textColor" | "color">
> = {
  Africa: {
    bgColor: "bg-camouflage-green",
    textColor: "text-white",
    color: "#7d8471",
  },
  Asia: {
    bgColor: "bg-au-chico",
    textColor: "text-white",
    color: "#a0665c",
  },
  Americas: {
    bgColor: "bg-smoky",
    textColor: "text-white",
    color: "#6c5b7b",
  },
  Europe: {
    bgColor: "bg-shuttle-gray",
    textColor: "text-white",
    color: "#5a6c7d",
  },
  Oceania: {
    bgColor: "bg-trout",
    textColor: "text-white",
    color: "#495057",
  },
  "Global and Interregional": {
    bgColor: "bg-gray-500",
    textColor: "text-white",
    color: "#6b7280",
  },
};

const fallbackVisual = {
  bgColor: "bg-gray-400",
  textColor: "text-white",
  color: "#9ca3af",
};

export const regionStyles: Record<string, RegionStyle> = Object.fromEntries(
  organizationTaxonomies.regions.map(({ key, label, order }) => [
    key,
    { label, order, ...(regionVisuals[key] ?? fallbackVisual) },
  ]),
);

/**
 * Get style configuration for a region
 * Falls back to default gray styling if region is not found
 */
export function getRegionStyle(region: string): RegionStyle {
  return (
    regionStyles[region] || {
      bgColor: "bg-gray-400",
      textColor: "text-white",
      color: "#9ca3af",
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
