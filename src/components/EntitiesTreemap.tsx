"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { Entity, BudgetEntry, EntityRevenue } from "@/types";
import { useDeepLink } from "@/hooks/useDeepLink";
import {
  systemGroupingStyles,
  getSystemGroupingStyle,
  getSortedSystemGroupings,
} from "@/lib/systemGroupings";
import { formatBudget } from "@/lib/entities";
import { EntitySidebar } from "@/components/EntitySidebar";
import { YearSlider } from "@/components/YearSlider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { generateYearRange, YEAR_RANGES } from "@/lib/data";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TreemapItem {
  value: number;
  data: Entity;
}

const GAP = 0.15;

function squarify(
  items: TreemapItem[],
  x: number,
  y: number,
  width: number,
  height: number
): (Rect & { data: Entity })[] {
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
): (Rect & { data: Entity })[] {
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

const SPENDING_YEARS = generateYearRange(YEAR_RANGES.entitySpending.min, YEAR_RANGES.entitySpending.max);
const REVENUE_YEARS = generateYearRange(YEAR_RANGES.entityRevenue.min, YEAR_RANGES.entityRevenue.max);

export function EntitiesTreemap() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [spendingData, setSpendingData] = useState<Record<string, number>>({});
  const [revenueData, setRevenueData] = useState<Record<string, EntityRevenue>>({});
  const [showRevenue, setShowRevenue] = useState(false);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGroups, setActiveGroups] = useState<Set<string>>(
    new Set(Object.keys(systemGroupingStyles))
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [spendingYear, setSpendingYear] = useState<number>(YEAR_RANGES.entitySpending.default);
  const [revenueYear, setRevenueYear] = useState<number>(YEAR_RANGES.entityRevenue.default);
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "entity",
    sectionId: "entities",
  });

  // Open sidebar when data is loaded and there's a pending deep link
  useEffect(() => {
    if (!loading && pendingDeepLink && entities.length > 0) {
      const entity = entities.find(e => e.entity === pendingDeepLink);
      if (entity) {
        setSelectedEntity(entity);
      }
      setPendingDeepLink(null);
    }
  }, [loading, pendingDeepLink, entities]);

  // Current year based on mode
  const currentYear = showRevenue ? revenueYear : spendingYear;
  const currentYears = showRevenue ? REVENUE_YEARS : SPENDING_YEARS;
  const setCurrentYear = showRevenue ? setRevenueYear : setSpendingYear;

  // Load static entities data once
  useEffect(() => {
    fetch(`${basePath}/data/entities.json`)
      .then((res) => res.json())
      .then((data: Entity[]) => setEntities(data))
      .catch((err) => console.error("Failed to load entities:", err));
  }, []);

  // Load spending data when spending year changes
  useEffect(() => {
    setLoading(true);
    fetch(`${basePath}/data/entity-spending-${spendingYear}.json`)
      .then((res) => res.json())
      .then((spendingArray: BudgetEntry[]) => {
        const spendingLookup = spendingArray.reduce(
          (acc: Record<string, number>, entry: BudgetEntry) => {
            acc[entry.entity] = entry.amount;
            return acc;
          },
          {}
        );
        setSpendingData(spendingLookup);
        if (!showRevenue) setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load spending data:", err);
        if (!showRevenue) setLoading(false);
      });
  }, [spendingYear, showRevenue]);

  // Load revenue data when revenue year changes
  useEffect(() => {
    setLoading(true);
    fetch(`${basePath}/data/entity-revenue-${revenueYear}.json`)
      .then((res) => res.json())
      .then((revenueObj: Record<string, EntityRevenue>) => {
        setRevenueData(revenueObj);
        if (showRevenue) setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load revenue data:", err);
        if (showRevenue) setLoading(false);
      });
  }, [revenueYear, showRevenue]);

  // Synthetic entities for revenue mode (CEB aggregates)
  const syntheticRevenueEntities: Entity[] = [
    {
      entity: "UN",
      entity_long: "Other UN Secretariat (incl. Political Missions)",
      entity_combined: "Other UN Secretariat (incl. Political Missions)",
      entity_description: "Aggregate revenue for the UN Secretariat including Special Political Missions. CEB reports this as a single entity. Excludes UNEP, UNODC, UN-Habitat, and ITC which report separately.",
      entity_link: "https://unsceb.org",
      entity_link_is_un_org: 1,
      system_grouping: "UN Secretariat",
      category: "CEB Aggregate",
      un_principal_organ: "General Assembly",
      un_pillar: null,
      is_ceb_member: true,
      head_of_entity_level: null,
      head_of_entity_title_specific: null,
      head_of_entity_title_general: null,
      head_of_entity_name: null,
      head_of_entity_bio: null,
      head_of_entity_headshot: null,
      global_leadership_team_url: null,
      on_display: "TRUE",
      foundational_mandate: null,
      organizational_chart_link: null,
      budget_financial_reporting_link: null,
      results_framework_link: null,
      strategic_plan_link: null,
      annual_reports_link: null,
      transparency_portal_link: null,
      socials_linkedin: null,
      socials_twitter: null,
      socials_instagram: null,
      entity_news_page: null,
      entity_branding_page: null,
      entity_data_page: null,
      entity_logo_page: null,
      entity_wikipedia_page: null,
    },
    {
      entity: "UN-DPO",
      entity_long: "Peacekeeping Operations",
      entity_combined: "Peacekeeping Operations (UN-DPO)",
      entity_description: "Aggregate revenue for UN Peacekeeping Operations. CEB reports all peacekeeping missions under this single entity.",
      entity_link: "https://peacekeeping.un.org",
      entity_link_is_un_org: 1,
      system_grouping: "Peacekeeping Operations",
      category: "CEB Aggregate",
      un_principal_organ: "Security Council",
      un_pillar: null,
      is_ceb_member: true,
      head_of_entity_level: null,
      head_of_entity_title_specific: null,
      head_of_entity_title_general: null,
      head_of_entity_name: null,
      head_of_entity_bio: null,
      head_of_entity_headshot: null,
      global_leadership_team_url: null,
      on_display: "TRUE",
      foundational_mandate: null,
      organizational_chart_link: null,
      budget_financial_reporting_link: null,
      results_framework_link: null,
      strategic_plan_link: null,
      annual_reports_link: null,
      transparency_portal_link: null,
      socials_linkedin: null,
      socials_twitter: null,
      socials_instagram: null,
      entity_news_page: null,
      entity_branding_page: null,
      entity_data_page: null,
      entity_logo_page: null,
      entity_wikipedia_page: null,
    },
  ];

  // Get the appropriate budget data and entities based on toggle
  const budgetData = showRevenue 
    ? Object.fromEntries(Object.entries(revenueData).map(([k, v]) => [k, v.total]))
    : spendingData;

  // In revenue mode, use synthetic entities for UN/UN-DPO, plus regular entities that have revenue
  const activeEntities = showRevenue
    ? [
        ...syntheticRevenueEntities.filter((e) => revenueData[e.entity]),
        ...entities.filter(
          (e) =>
            revenueData[e.entity] &&
            e.entity !== "UN" &&
            e.entity !== "UN-DPO"
        ),
      ]
    : entities;

  const toggleGroup = (groupKey: string) => {
    setActiveGroups((prev) => {
      // If this group is the only active one, show all groups
      if (prev.size === 1 && prev.has(groupKey)) {
        return new Set(Object.keys(systemGroupingStyles));
      }
      // Otherwise, show only this group
      return new Set([groupKey]);
    });
  };

  const handleReset = () => {
    setSearchQuery("");
    setActiveGroups(new Set(Object.keys(systemGroupingStyles)));
  };

  // Get entities with budget > 0
  const entitiesWithBudget = activeEntities.filter(
    (entity) =>
      entity.entity &&
      entity.system_grouping &&
      budgetData[entity.entity] &&
      budgetData[entity.entity] > 0
  );

  // Count entities for each group
  const groupCounts = entitiesWithBudget.reduce(
    (acc, entity) => {
      acc[entity.system_grouping] = (acc[entity.system_grouping] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Check if all groups are active
  const allGroupsActive =
    activeGroups.size === Object.keys(systemGroupingStyles).length;

  // Get selected value for dropdown
  const getSelectedValue = () => {
    if (allGroupsActive) return "all";
    if (activeGroups.size === 1) return Array.from(activeGroups)[0];
    return "all";
  };

  const handleValueChange = (value: string) => {
    if (value === "all") {
      setActiveGroups(new Set(Object.keys(systemGroupingStyles)));
    } else {
      toggleGroup(value);
    }
  };

  // Get display text for current selection
  const getDisplayText = () => {
    if (allGroupsActive) {
      return (
        <div className="flex items-center gap-2">
          <div className="ml-2 h-4 w-4 flex-shrink-0 rounded bg-un-blue"></div>
          <span className="text-sm font-medium">
            All Groups ({entitiesWithBudget.length})
          </span>
        </div>
      );
    }

    if (activeGroups.size === 1) {
      const activeGroup = Array.from(activeGroups)[0];
      const styles = systemGroupingStyles[activeGroup];
      const count = groupCounts[activeGroup] || 0;
      return (
        <div className="flex items-center gap-2">
          <div
            className={`${styles.bgColor} ml-2 h-4 w-4 flex-shrink-0 rounded`}
          ></div>
          <span className="text-sm font-medium">
            {styles.label} ({count})
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="ml-2 h-4 w-4 flex-shrink-0 rounded bg-un-blue"></div>
        <span className="text-sm font-medium">
          All Groups ({entitiesWithBudget.length})
        </span>
      </div>
    );
  };

  // Check if reset is needed
  const isResetNeeded = searchQuery.trim() !== "" || !allGroupsActive;

  // Search function
  const searchEntities = (query: string, entityList: Entity[]) => {
    if (!query.trim()) return entityList;
    const searchTerm = query.toLowerCase();
    return entityList.filter(
      (entity) =>
        entity.entity?.toLowerCase().includes(searchTerm) ||
        entity.entity_long?.toLowerCase().includes(searchTerm)
    );
  };

  if (loading) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">Loading entities...</p>
      </div>
    );
  }

  // Filter entities by active groups, budget > 0, and search
  const filteredEntities = searchEntities(searchQuery, entitiesWithBudget)
    .filter((entity) => activeGroups.has(entity.system_grouping));

  // Group entities by system_grouping
  const groups = filteredEntities.reduce(
    (acc, entity) => {
      const budget = budgetData[entity.entity] || 0;
      if (budget > 0) {
        if (!acc[entity.system_grouping]) {
          acc[entity.system_grouping] = [];
        }
        acc[entity.system_grouping].push({ value: budget, data: entity });
      }
      return acc;
    },
    {} as Record<string, TreemapItem[]>
  );

  const sortedGroups = Object.entries(groups).sort(([groupA], [groupB]) => {
    const orderA = getSystemGroupingStyle(groupA).order;
    const orderB = getSystemGroupingStyle(groupB).order;
    return orderA - orderB;
  });

  // Render filter controls inline (not as a function component to avoid focus loss)
  const filterControlsJSX = (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          {/* Search Input */}
          <ChartSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search entities..."
          />

          {/* Filter Dropdown */}
          <div className="relative w-full sm:w-[280px]">
            <Select value={getSelectedValue()} onValueChange={handleValueChange}>
              <SelectTrigger
                className="h-9 w-full rounded-none border-0 border-b border-gray-300 bg-transparent px-0 py-1.5 text-sm transition-all duration-300 ease-out hover:border-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <SelectValue asChild>
                  <span className="flex items-center transition-all duration-300 ease-out">
                    {getDisplayText()}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className="w-full border-gray-300 bg-white sm:w-[280px]"
                position="popper"
                side="bottom"
                align="start"
                sideOffset={4}
              >
                <SelectItem value="all">
                  <div className="flex items-center gap-2 py-0.5">
                    <div className="h-4 w-4 flex-shrink-0 rounded bg-un-blue"></div>
                    <span className="text-sm font-medium">
                      All Groups ({entitiesWithBudget.length})
                    </span>
                  </div>
                </SelectItem>

                {getSortedSystemGroupings().map(([group, styles]) => {
                  const count = groupCounts[group] || 0;
                  if (count === 0) return null;
                  return (
                    <SelectItem key={group} value={group}>
                      <div className="flex items-center gap-2 py-0.5">
                        <div
                          className={`${styles.bgColor} h-4 w-4 flex-shrink-0 rounded`}
                        ></div>
                        <span className="text-sm font-medium">
                          {styles.label} ({count})
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Button */}
          {isResetNeeded && (
            <button
              onClick={handleReset}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all duration-200 ease-out hover:bg-gray-400 hover:text-gray-100 focus:bg-gray-400 focus:text-gray-100 focus:outline-none"
              aria-label="Clear filters and search"
              title="Clear filters and search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Year Slider */}
          <YearSlider
            years={currentYears}
            selectedYear={currentYear}
            onChange={setCurrentYear}
          />

          {/* Revenue/Spending Toggle */}
          <div className="flex h-9 items-center gap-2">
            <span className={`text-sm ${showRevenue ? "font-medium text-gray-900" : "text-gray-500"}`}>
              Revenue
            </span>
            <Switch
              checked={!showRevenue}
              onCheckedChange={(checked) => setShowRevenue(!checked)}
              aria-label="Toggle between revenue and spending"
            />
            <span className={`text-sm ${!showRevenue ? "font-medium text-gray-900" : "text-gray-500"}`}>
              Spending
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (sortedGroups.length === 0) {
    return (
      <div className="w-full">
        {filterControlsJSX}
        <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-500">
            No entities match the selected filters
          </p>
        </div>
      </div>
    );
  }

  const totalBudget = sortedGroups.reduce(
    (sum, [, items]) => sum + items.reduce((s, item) => s + item.value, 0),
    0
  );

  const MIN_HEIGHT_THRESHOLD = 5;
  const { regularGroups, smallGroups } = sortedGroups.reduce<{
    regularGroups: Array<[string, TreemapItem[]]>;
    smallGroups: Array<[string, TreemapItem[]]>;
  }>(
    (acc, [groupKey, groupItems]) => {
      const groupTotal = groupItems.reduce((sum, item) => sum + item.value, 0);
      const groupHeight = (groupTotal / totalBudget) * 100;

      if (groupHeight < MIN_HEIGHT_THRESHOLD) {
        acc.smallGroups.push([groupKey, groupItems]);
      } else {
        acc.regularGroups.push([groupKey, groupItems]);
      }
      return acc;
    },
    { regularGroups: [], smallGroups: [] }
  );

  const groupSpacing = GAP;
  let currentY = 0;

  const renderEntities = (
    groupKey: string,
    items: TreemapItem[],
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const styles =
      systemGroupingStyles[groupKey] || getSystemGroupingStyle(groupKey);
    const sortedItems = [...items].sort((a, b) => b.value - a.value);
    const rects = squarify(sortedItems, x, y, width, height);

    return rects.map((rect, i) => {
      const entityBudget = budgetData[rect.data.entity] || 0;
      const showLabel = rect.width > 3 && rect.height > 2;
      const isHovered = hoveredEntity === rect.data.entity;
      const entityGroupStyle = getSystemGroupingStyle(
        rect.data.system_grouping || ""
      );

      // Get revenue breakdown for bar chart display
      const entityRevenue = revenueData[rect.data.entity];
      const hasRevenueBreakdown = showRevenue && entityRevenue?.by_type;
      const revenueTypes = hasRevenueBreakdown
        ? Object.entries(entityRevenue.by_type).sort((a, b) => {
            const order = ["Assessed", "Voluntary un-earmarked", "Voluntary earmarked", "Other"];
            return order.indexOf(a[0]) - order.indexOf(b[0]);
          })
        : [];
      const revenueTotal = hasRevenueBreakdown
        ? Object.values(entityRevenue.by_type).reduce((sum, val) => sum + val, 0)
        : 0;

      // Get opacity for revenue type (using category color as base)
      const getRevenueTypeOpacity = (type: string): string => {
        if (type === "Assessed") return "opacity-100";
        if (type === "Voluntary un-earmarked") return "opacity-80";
        if (type === "Voluntary earmarked") return "opacity-60";
        return "opacity-40";
      };

      return (
        <Tooltip
          key={`${rect.data.entity}-${i}`}
          delayDuration={50}
          disableHoverableContent
        >
          <TooltipTrigger asChild>
            <div
              data-entity={rect.data.entity}
              className={`absolute cursor-pointer ${!hasRevenueBreakdown ? styles.bgColor : ""} ${styles.textColor}`}
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                opacity: isHovered ? 1 : 0.9,
                zIndex: isHovered ? 10 : 1,
              }}
              onClick={() => setSelectedEntity(rect.data)}
              onMouseEnter={() => setHoveredEntity(rect.data.entity)}
              onMouseLeave={() => setHoveredEntity(null)}
            >
              {/* Revenue type breakdown bars (revenue mode only) */}
              {hasRevenueBreakdown && (
                <div className="absolute inset-0 flex flex-col">
                  {revenueTypes.map(([type, amount], idx) => {
                    const percentage = (amount / revenueTotal) * 100;
                    return (
                      <div
                        key={idx}
                        className={`${styles.bgColor} ${getRevenueTypeOpacity(type)}`}
                        style={{ height: `${percentage}%` }}
                      />
                    );
                  })}
                </div>
              )}
              {/* Solid background for spending mode */}
              {!hasRevenueBreakdown && showRevenue && (
                <div className={`absolute inset-0 ${styles.bgColor}`} />
              )}
              {/* Label overlay */}
              {showLabel && (
                <div className="relative h-full overflow-hidden p-1">
                  <div className="truncate text-xs font-medium leading-tight">
                    {rect.data.entity === "UN" || rect.data.entity === "UN-DPO"
                      ? rect.data.entity_long
                      : rect.data.entity}
                  </div>
                  <div className="truncate text-xs leading-tight opacity-70 transition-opacity duration-300">
                    {formatBudget(entityBudget)}
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
                {rect.data.entity_long}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${entityGroupStyle.bgColor}`}
                />
                <span className="text-xs text-slate-500">
                  {entityGroupStyle.label}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {formatBudget(entityBudget)}
              </p>
              <p className="mt-1 hidden text-xs text-slate-400 sm:block">
                Click to view entity details
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
      {filterControlsJSX}

      {/* Treemap */}
      <div className="relative h-[650px] w-full bg-gray-100">
        {regularGroups.slice(0, -1).map(([groupKey, groupItems]) => {
          const groupTotal = groupItems.reduce(
            (sum, item) => sum + item.value,
            0
          );
          const groupHeight = (groupTotal / totalBudget) * 100 - groupSpacing;
          const elements = renderEntities(
            groupKey,
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
              (lastRowTotal / totalBudget) * 100 - groupSpacing;

            const groupTreemapItems = lastRowGroups.map(
              ([groupKey, items]) => ({
                groupKey,
                value: items.reduce((sum, item) => sum + item.value, 0),
                items,
              })
            );

            const groupRects = squarify(
              groupTreemapItems.map((g) => ({
                value: g.value,
                data: {
                  entity: g.groupKey,
                  system_grouping: g.groupKey,
                } as Entity,
              })),
              0,
              currentY,
              100,
              lastRowHeight
            );

            return groupRects.flatMap((groupRect, idx) => {
              const { groupKey, items } = groupTreemapItems[idx];
              return renderEntities(
                groupKey,
                items,
                groupRect.x,
                groupRect.y,
                groupRect.width,
                groupRect.height
              );
            });
          })()}
      </div>

      {/* Revenue Type Legend (only in revenue mode) */}
      {showRevenue && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-3">
            {[
              { type: "Assessed", label: "Assessed", opacity: "opacity-100" },
              { type: "Voluntary un-earmarked", label: "Voluntary un-earmarked", opacity: "opacity-80" },
              { type: "Voluntary earmarked", label: "Voluntary earmarked", opacity: "opacity-60" },
            ].map(({ type, label, opacity }) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded-sm bg-gray-500 ${opacity}`} />
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedEntity && (
        <EntitySidebar
          entity={selectedEntity}
          spending={spendingData[selectedEntity.entity] || 0}
          revenue={revenueData[selectedEntity.entity] || null}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  );
}
