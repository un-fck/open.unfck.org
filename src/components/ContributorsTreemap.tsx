"use client";

import { useEffect, useState } from "react";
import { ContributorSidebar } from "@/components/ContributorSidebar";
import { YearSlider } from "@/components/YearSlider";
import { useDeepLink } from "@/hooks/useDeepLink";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CONTRIBUTION_TYPES,
  Contributor,
  ContributorData,
  formatBudget,
  getContributionTypeColor,
  getContributionTypeOrder,
  getDisplayName,
  getStatusStyle,
  getTotalContributions,
  isGovernmentDonor,
} from "@/lib/contributors";
import { generateYearRange, YEAR_RANGES } from "@/lib/data";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TreemapItem {
  value: number;
  data: Contributor;
}

interface ContributionBreakdown {
  [key: string]: number;
}

const getContributionBreakdown = (
  contributions: Record<string, Record<string, number>>
): ContributionBreakdown => {
  const breakdown: ContributionBreakdown = {};
  Object.values(contributions).forEach((entityContribs) => {
    Object.entries(entityContribs).forEach(([type, amount]) => {
      breakdown[type] = (breakdown[type] || 0) + amount;
    });
  });
  return breakdown;
};

const DEFAULT_GAP = 0.15;

interface GapConfig {
  horizontal: number; // Gap for vertical splits (vertical lines between tiles)
  vertical: number;   // Gap for horizontal splits (horizontal lines between tiles)
}

function squarify(
  items: TreemapItem[],
  x: number,
  y: number,
  width: number,
  height: number,
  gap: number | GapConfig = DEFAULT_GAP
): (Rect & { data: Contributor })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || items.length === 0) return [];

  const normalized = items.map((item) => ({
    ...item,
    normalizedValue: (item.value / total) * width * height,
  }));

  const gapConfig: GapConfig = typeof gap === 'number' 
    ? { horizontal: gap, vertical: gap } 
    : gap;

  return slice(normalized, x, y, width, height, gapConfig);
}

function slice(
  items: (TreemapItem & { normalizedValue: number })[],
  x: number,
  y: number,
  width: number,
  height: number,
  gap: GapConfig
): (Rect & { data: Contributor })[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, width, height, data: items[0].data }];
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

  if (width > height) {
    // Vertical split - creates vertical gap lines (use horizontal gap)
    // Only when clearly wider than tall
    const g = gap.horizontal;
    const leftWidth = width * (leftSum / total) - g / 2;
    return [
      ...slice(leftItems, x, y, leftWidth, height, gap),
      ...slice(
        rightItems,
        x + leftWidth + g,
        y,
        width - leftWidth - g,
        height,
        gap
      ),
    ];
  } else {
    // Horizontal split - creates horizontal gap lines (use vertical gap)
    // Preferred when square or taller than wide - puts largest items at top
    const g = gap.vertical;
    const leftHeight = height * (leftSum / total) - g / 2;
    return [
      ...slice(leftItems, x, y, width, leftHeight, gap),
      ...slice(
        rightItems,
        x,
        y + leftHeight + g,
        width,
        height - leftHeight - g,
        gap
      ),
    ];
  }
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const DONOR_YEARS = generateYearRange(YEAR_RANGES.donors.min, YEAR_RANGES.donors.max);

export function ContributorsTreemap() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedContributor, setSelectedContributor] =
    useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(YEAR_RANGES.donors.default);
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "donor",
    sectionId: "donors",
  });

  // Open sidebar when data is loaded and there's a pending deep link
  useEffect(() => {
    if (!loading && pendingDeepLink && contributors.length > 0) {
      const contributor = contributors.find(c => c.name === pendingDeepLink);
      if (contributor) {
        setSelectedContributor(contributor);
      }
      setPendingDeepLink(null);
    }
  }, [loading, pendingDeepLink, contributors]);

  useEffect(() => {
    setLoading(true);
    fetch(`${basePath}/data/donors-${selectedYear}.json`)
      .then((res) => res.json())
      .then((data: Record<string, ContributorData>) => {
        const parsed = Object.entries(data).map(([name, info]) => ({
          name,
          status: info.status,
          contributions: info.contributions,
          payment_status: info.payment_status,
        }));
        setContributors(parsed);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load donors data:", err);
        setLoading(false);
      });
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">Loading contributors...</p>
      </div>
    );
  }

  // Filter contributors by search query
  const filteredContributors = searchQuery.trim()
    ? contributors.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contributors;

  // Split contributors into government and organization groups
  const govItems: TreemapItem[] = filteredContributors
    .filter((c) => isGovernmentDonor(c.status))
    .map((contributor) => ({
      value: getTotalContributions(contributor.contributions),
      data: contributor,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const orgItems: TreemapItem[] = filteredContributors
    .filter((c) => !isGovernmentDonor(c.status))
    .map((contributor) => ({
      value: getTotalContributions(contributor.contributions),
      data: contributor,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const allItems = [...govItems, ...orgItems];

  if (allItems.length === 0) {
    return (
      <div className="w-full">
        {/* Filter Controls */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <ChartSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search contributors..."
          />
          <YearSlider
            years={DONOR_YEARS}
            selectedYear={selectedYear}
            onChange={setSelectedYear}
          />
        </div>
        <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-500">
            {searchQuery.trim() ? "No contributors match your search" : "No contribution data available"}
          </p>
        </div>
      </div>
    );
  }

  // Calculate totals for proportional heights
  const govTotal = govItems.reduce((sum, item) => sum + item.value, 0);
  const orgTotal = orgItems.reduce((sum, item) => sum + item.value, 0);
  const grandTotal = govTotal + orgTotal;

  // Calculate height percentages (with gap between sections)
  const sectionGap = 0.5; // Gap between government and organization sections
  const govHeightPct = grandTotal > 0 ? (govTotal / grandTotal) * (100 - sectionGap) : 0;
  const orgHeightPct = grandTotal > 0 ? (orgTotal / grandTotal) * (100 - sectionGap) : 0;

  // Generate rects for each group (in their own 0-100 coordinate space)
  const govRects = govItems.length > 0 ? squarify(govItems, 0, 0, 100, 100, DEFAULT_GAP) : [];
  // For org section: horizontal gaps (vertical lines) stay normal, 
  // but vertical gaps (horizontal lines) need scaling since the section height is compressed
  const orgVerticalGap = orgHeightPct > 0 ? Math.min(DEFAULT_GAP * (100 / orgHeightPct), 1.5) : DEFAULT_GAP;
  const orgRects = orgItems.length > 0 ? squarify(orgItems, 0, 0, 100, 100, {
    horizontal: DEFAULT_GAP,  // Vertical lines between tiles - no scaling needed
    vertical: orgVerticalGap, // Horizontal lines between tiles - scale to compensate for compressed height
  }) : [];

  const renderContributor = (
    rect: Rect & { data: Contributor },
    i: number
  ) => {
    // Color based on individual contributor's status
    const styles = getStatusStyle(rect.data.status);
    const stateContributions = getTotalContributions(rect.data.contributions);
    const breakdown = getContributionBreakdown(rect.data.contributions);
    const isOrg = !isGovernmentDonor(rect.data.status);
    
    // Determine if label should show based on size
    const showLabel = rect.width > 3 && rect.height > 2;
    const isHovered = hoveredState === rect.data.name;

    const breakdownEntries = Object.entries(breakdown).sort(
      (a, b) => getContributionTypeOrder(a[0]) - getContributionTypeOrder(b[0])
    );
    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    return (
      <Tooltip key={`${rect.data.name}-${i}`} delayDuration={50}>
        <TooltipTrigger asChild>
          <div
            data-state={rect.data.name}
            className="absolute cursor-pointer"
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
              zIndex: isHovered ? 10 : 1,
            }}
            onClick={() => setSelectedContributor(rect.data)}
            onMouseEnter={() => setHoveredState(rect.data.name)}
            onMouseLeave={() => setHoveredState(null)}
          >
            {/* For organizations: solid color with opacity-60 (matching voluntary earmarked). For government: contribution type breakdown */}
            {isOrg ? (
              <div className={`h-full w-full ${styles.bgColor} opacity-60`} />
            ) : (
              <div className="flex h-full w-full flex-col">
                {breakdownEntries.map(([type, amount], idx) => {
                  const percentage = (amount / total) * 100;
                  const opacity = getContributionTypeColor(type);
                  return (
                    <div
                      key={idx}
                      className={`${styles.bgColor} ${opacity}`}
                      style={{ height: `${percentage}%` }}
                    />
                  );
                })}
              </div>
            )}
            {/* Label overlay */}
            {showLabel && (
              <div
                className={`absolute inset-0 overflow-hidden p-1 ${styles.textColor}`}
              >
                <div className="truncate text-xs font-medium leading-tight">
                  {getDisplayName(rect.data.name)}
                </div>
                <div className="truncate text-xs leading-tight opacity-90">
                  {formatBudget(stateContributions)}
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
              {rect.data.name}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <span className={`inline-block h-2 w-2 rounded-full ${styles.bgColor}`} />
              {styles.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              {formatBudget(stateContributions)}
            </p>
            <p className="mt-1 hidden text-xs text-slate-400 sm:block">
              Click to view contributor details
            </p>
            <p className="mt-1 text-xs text-slate-400 sm:hidden">
              Tap to view details
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="w-full">
      {/* Filter Controls */}
      <div className="mb-3 flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end sm:justify-between">
        <ChartSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search contributors..."
        />

        {/* Year Slider */}
        <YearSlider
          years={DONOR_YEARS}
          selectedYear={selectedYear}
          onChange={setSelectedYear}
        />
      </div>

      <div className="relative h-[650px] w-full bg-gray-100">
        {/* Government donors section */}
        {govRects.length > 0 && (
          <div 
            className="absolute left-0 top-0 w-full"
            style={{ height: `${govHeightPct}%` }}
          >
            {govRects.map((rect, i) => renderContributor(rect, i))}
          </div>
        )}
        
        {/* Organization donors section */}
        {orgRects.length > 0 && (
          <div 
            className="absolute left-0 w-full"
            style={{ 
              top: `${govHeightPct + sectionGap}%`,
              height: `${orgHeightPct}%` 
            }}
          >
            {orgRects.map((rect, i) => renderContributor(rect, i))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        {/* Contribution Type Legend (applies to government donors) */}
        <div className="flex flex-wrap gap-3">
          {CONTRIBUTION_TYPES.filter(t => t.type !== "Other").map(({ type, label, opacity }) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-sm bg-un-blue-muted ${opacity}`} />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
        
        {/* Contributor Type Legend */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-un-blue-muted" />
            <span className="text-xs text-gray-600">Government</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-faded-jade opacity-60" />
            <span className="text-xs text-gray-600">Non-Government</span>
          </div>
        </div>
      </div>

      {selectedContributor && (
        <ContributorSidebar
          contributor={selectedContributor}
          onClose={() => setSelectedContributor(null)}
        />
      )}
    </div>
  );
}
