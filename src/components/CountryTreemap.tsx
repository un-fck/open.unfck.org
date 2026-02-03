"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClickHint } from "@/components/ui/ClickHint";
import { formatBudget } from "@/lib/entities";
import { getRegionStyle, regionStyles } from "@/lib/regionGroupings";

interface CountryExpense {
  iso3: string;
  name: string;
  region: string;
  lat: number;
  long: number;
  total: number;
  entities: Record<string, number>;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TreemapItem {
  value: number;
  data: CountryExpense;
}

interface RegionTreemapItem {
  value: number;
  region: string;
  countries: TreemapItem[];
}

const GAP = 0.15;

function squarify(
  items: { value: number }[],
  x: number,
  y: number,
  width: number,
  height: number
): Rect[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || items.length === 0) return [];

  const normalized = items.map((item) => ({
    ...item,
    normalizedValue: (item.value / total) * width * height,
  }));

  return slice(normalized, x, y, width, height);
}

function slice(
  items: { normalizedValue: number }[],
  x: number,
  y: number,
  width: number,
  height: number
): Rect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, width, height }];
  }

  const total = items.reduce((sum, item) => sum + item.normalizedValue, 0);

  let sum = 0;
  let splitIndex = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].normalizedValue;
    if (sum >= total / 2) {
      splitIndex = i + 1;
      break;
    }
  }
  splitIndex = Math.max(1, Math.min(splitIndex, items.length - 1));

  const leftItems = items.slice(0, splitIndex);
  const rightItems = items.slice(splitIndex);

  const leftSum = leftItems.reduce(
    (sum, item) => sum + item.normalizedValue,
    0
  );

  if (width >= height) {
    const leftWidth = width * (leftSum / total) - GAP / 2;
    return [
      ...slice(leftItems, x, y, leftWidth, height),
      ...slice(
        rightItems,
        x + leftWidth + GAP,
        y,
        width - leftWidth - GAP,
        height
      ),
    ];
  } else {
    const leftHeight = height * (leftSum / total) - GAP / 2;
    return [
      ...slice(leftItems, x, y, width, leftHeight),
      ...slice(
        rightItems,
        x,
        y + leftHeight + GAP,
        width,
        height - leftHeight - GAP
      ),
    ];
  }
}

interface CountryTreemapProps {
  data: CountryExpense[];
  onCountryClick: (country: CountryExpense) => void;
}

export function CountryTreemap({ data, onCountryClick }: CountryTreemapProps) {
  // Group countries by region
  const regionGroups = data.reduce(
    (acc, country) => {
      const region = country.region || "Unknown";
      if (!acc[region]) {
        acc[region] = [];
      }
      acc[region].push({ value: country.total, data: country });
      return acc;
    },
    {} as Record<string, TreemapItem[]>
  );

  // Create region items with totals
  const regionItems: RegionTreemapItem[] = Object.entries(regionGroups)
    .map(([region, countries]) => ({
      region,
      value: countries.reduce((sum, c) => sum + c.value, 0),
      countries: countries.sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => {
      const orderA = getRegionStyle(a.region).order;
      const orderB = getRegionStyle(b.region).order;
      return orderA - orderB;
    });

  // Calculate region rectangles
  const regionRects = squarify(regionItems, 0, 0, 100, 100);

  return (
    <div className="relative h-[650px] w-full bg-gray-100">
      {regionItems.map((regionItem, regionIndex) => {
        const regionRect = regionRects[regionIndex];
        if (!regionRect) return null;

        const styles = getRegionStyle(regionItem.region);

        // Calculate country rectangles within this region
        const countryRects = squarify(
          regionItem.countries,
          regionRect.x,
          regionRect.y,
          regionRect.width,
          regionRect.height
        );

        return regionItem.countries.map((countryItem, countryIndex) => {
          const countryRect = countryRects[countryIndex];
          if (!countryRect) return null;

          const showLabel = countryRect.width > 4 && countryRect.height > 3;

          return (
            <Tooltip
              key={countryItem.data.iso3}
              delayDuration={50}
              disableHoverableContent
            >
              <TooltipTrigger asChild>
                <div
                  className={`absolute cursor-pointer transition-all duration-150 hover:ring-2 hover:ring-white/60 hover:brightness-110 ${styles.bgColor} ${styles.textColor}`}
                  style={{
                    left: `${countryRect.x}%`,
                    top: `${countryRect.y}%`,
                    width: `${countryRect.width}%`,
                    height: `${countryRect.height}%`,
                  }}
                  onClick={() => onCountryClick(countryItem.data)}
                >
                  {showLabel && (
                    <div className="h-full overflow-hidden p-1">
                      <div className="truncate text-xs font-medium leading-tight">
                        {countryItem.data.name}
                      </div>
                      <div className="truncate text-xs leading-tight opacity-70">
                        {formatBudget(countryItem.data.total)}
                      </div>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                className="max-w-xs border border-slate-200 bg-white text-slate-800 shadow-lg sm:max-w-sm"
                hideWhenDetached
                avoidCollisions={true}
                collisionPadding={12}
              >
                <div className="max-w-xs p-1 text-center sm:max-w-sm">
                  <p className="text-xs font-medium leading-tight sm:text-sm">
                    {countryItem.data.name}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${styles.bgColor}`}
                    />
                    <span className="text-xs text-slate-500">
                      {styles.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {formatBudget(countryItem.data.total)}
                  </p>
                  <ClickHint />
                </div>
              </TooltipContent>
            </Tooltip>
          );
        });
      })}
    </div>
  );
}
