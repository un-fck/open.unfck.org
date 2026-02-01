"use client";

import { useEffect, useState } from "react";
import { ContributorSidebar } from "@/components/ContributorSidebar";
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

export function ContributorsTreemap() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedContributor, setSelectedContributor] =
    useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${basePath}/data/donors.json`)
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
  }, []);

  if (loading) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">Loading contributors...</p>
      </div>
    );
  }

  const groups = contributors.reduce(
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
      <div className="flex h-[650px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">No contribution data available</p>
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
          >
            <div className="max-w-xs p-1 text-center sm:max-w-sm">
              <p className="text-xs font-medium leading-tight sm:text-sm">
                {rect.data.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">{styles.label}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {formatBudget(stateContributions)}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    });
  };

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {CONTRIBUTION_TYPES.map(({ type, label, opacity }) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className={`h-3 w-5 rounded-sm bg-un-blue-muted ${opacity}`}
            />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
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

      {selectedContributor && (
        <ContributorSidebar
          contributor={selectedContributor}
          onClose={() => setSelectedContributor(null)}
        />
      )}
    </div>
  );
}
