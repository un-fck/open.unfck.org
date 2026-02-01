"use client";

import { useEffect, useState } from "react";
import { ContributorSidebar } from "@/components/ContributorSidebar";
import { YearSlider } from "@/components/YearSlider";
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

const GAP = 0.15;

function squarify(
  items: TreemapItem[],
  x: number,
  y: number,
  width: number,
  height: number
): (Rect & { data: Contributor })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || items.length === 0) return [];

  const normalized = items.map((item) => ({
    ...item,
    normalizedValue: (item.value / total) * width * height,
  }));

  return slice(normalized, x, y, width, height);
}

function slice(
  items: (TreemapItem & { normalizedValue: number })[],
  x: number,
  y: number,
  width: number,
  height: number
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

  const groups = filteredContributors.reduce(
    (acc, contributor) => {
      const contributions = getTotalContributions(contributor.contributions);
      if (contributions > 0) {
        if (!acc[contributor.status]) {
          acc[contributor.status] = [];
        }
        acc[contributor.status].push({ value: contributions, data: contributor });
      }
      return acc;
    },
    {} as Record<string, TreemapItem[]>
  );

  const sortedGroups = Object.entries(groups).sort(([statusA], [statusB]) => {
    const orderA = getStatusStyle(statusA).order;
    const orderB = getStatusStyle(statusB).order;
    return orderA - orderB;
  });

  if (sortedGroups.length === 0) {
    return (
      <div className="w-full">
        {/* Filter Controls */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative w-full sm:w-64">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
              <svg
                className="h-3.5 w-3.5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search contributors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block h-9 w-full rounded-none border-0 border-b border-gray-300 bg-transparent py-1.5 pl-8 pr-3 text-sm placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0"
            />
          </div>
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

  const totalContributions = sortedGroups.reduce(
    (sum, [, items]) => sum + items.reduce((s, item) => s + item.value, 0),
    0
  );

  const MIN_HEIGHT_THRESHOLD = 5;
  const { regularGroups, smallGroups } = sortedGroups.reduce<{
    regularGroups: Array<[string, TreemapItem[]]>;
    smallGroups: Array<[string, TreemapItem[]]>;
  }>(
    (acc, [status, groupItems]) => {
      const groupTotal = groupItems.reduce((sum, item) => sum + item.value, 0);
      const groupHeight = (groupTotal / totalContributions) * 100;

      if (groupHeight < MIN_HEIGHT_THRESHOLD) {
        acc.smallGroups.push([status, groupItems]);
      } else {
        acc.regularGroups.push([status, groupItems]);
      }
      return acc;
    },
    { regularGroups: [], smallGroups: [] }
  );

  const groupSpacing = GAP;
  let currentY = 0;

  const renderStates = (
    status: string,
    items: TreemapItem[],
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const sortedItems = [...items].sort((a, b) => b.value - a.value);
    const rects = squarify(sortedItems, x, y, width, height);

    return rects.map((rect, i) => {
      const styles = getStatusStyle(status);
      const stateContributions = getTotalContributions(rect.data.contributions);
      const breakdown = getContributionBreakdown(rect.data.contributions);
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
              {/* Contribution type breakdown */}
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
              <p className="mt-1 text-xs text-slate-500">{styles.label}</p>
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
    });
  };

  return (
    <div className="w-full">
      {/* Filter Controls */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
            <svg
              className="h-3.5 w-3.5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search contributors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block h-9 w-full rounded-none border-0 border-b border-gray-300 bg-transparent py-1.5 pl-8 pr-3 text-sm placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0"
          />
        </div>

        {/* Year Slider */}
        <YearSlider
          years={DONOR_YEARS}
          selectedYear={selectedYear}
          onChange={setSelectedYear}
        />
      </div>

      <div className="relative h-[650px] w-full bg-gray-100">
        {regularGroups.slice(0, -1).map(([status, groupItems]) => {
          const groupTotal = groupItems.reduce(
            (sum, item) => sum + item.value,
            0
          );
          const groupHeight =
            (groupTotal / totalContributions) * 100 - groupSpacing;
          const elements = renderStates(
            status,
            groupItems,
            0,
            currentY,
            100,
            groupHeight
          );
          currentY += groupHeight + groupSpacing;
          return elements;
        })}

        {regularGroups.length > 0 &&
          (() => {
            const lastRowGroups = [...regularGroups.slice(-1), ...smallGroups];
            const lastRowTotal = lastRowGroups.reduce(
              (sum, [, items]) =>
                sum + items.reduce((s, item) => s + item.value, 0),
              0
            );
            const lastRowHeight =
              (lastRowTotal / totalContributions) * 100 - groupSpacing;

            const groupTreemapItems = lastRowGroups.map(([status, items]) => ({
              status,
              value: items.reduce((sum, item) => sum + item.value, 0),
              items,
            }));

            const groupRects = squarify(
              groupTreemapItems.map((g) => ({
                value: g.value,
                data: {
                  name: g.status,
                  status: g.status as "member" | "observer" | "nonmember",
                  contributions: {},
                },
              })),
              0,
              currentY,
              100,
              lastRowHeight
            );

            return groupRects.flatMap((groupRect, idx) => {
              const { status, items } = groupTreemapItems[idx];
              return renderStates(
                status,
                items,
                groupRect.x,
                groupRect.y,
                groupRect.width,
                groupRect.height
              );
            });
          })()}
      </div>

      {/* Revenue Type Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-3">
          {CONTRIBUTION_TYPES.filter(t => t.type !== "Other").map(({ type, label, opacity }) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-sm bg-un-blue-muted ${opacity}`} />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
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
