"use client";

import React, { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatBudget } from "@/lib/entities";
import {
  SDGExpensesData,
  SDG_COLORS,
  SDG_SHORT_TITLES,
  SDG_TITLES,
} from "@/lib/sdgs";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TreemapItem {
  value: number;
  name: string;
}

const GAP = 0.15; // Small gap for entity sub-treemaps
const SDG_GAP = 0.8; // Larger gap between SDG cells for grid-like appearance

// Row-based treemap layout: fills left-to-right like a grid, then wraps to next row
function rowBasedLayout(
  items: TreemapItem[],
  x: number,
  y: number,
  width: number,
  height: number,
  itemsPerRow: number = 6
): (Rect & { data: TreemapItem })[] {
  if (items.length === 0) return [];

  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  if (totalValue === 0) return [];

  // Group items into rows
  const rows: TreemapItem[][] = [];
  for (let i = 0; i < items.length; i += itemsPerRow) {
    rows.push(items.slice(i, i + itemsPerRow));
  }

  // Calculate row totals for height distribution
  const rowTotals = rows.map((row) =>
    row.reduce((sum, item) => sum + item.value, 0)
  );
  const grandTotal = rowTotals.reduce((sum, t) => sum + t, 0);

  // Account for gaps in total available space
  const totalRowGaps = (rows.length - 1) * SDG_GAP;
  const availableHeight = height - totalRowGaps;

  const results: (Rect & { data: TreemapItem })[] = [];
  let currentY = y;

  rows.forEach((row, rowIndex) => {
    const rowTotal = rowTotals[rowIndex];
    // Row height proportional to its total value
    const rowHeight = (rowTotal / grandTotal) * availableHeight;

    // Account for gaps in row width
    const totalItemGaps = (row.length - 1) * SDG_GAP;
    const availableWidth = width - totalItemGaps;

    let currentX = x;
    row.forEach((item) => {
      // Item width proportional to its value within the row
      const itemWidth = (item.value / rowTotal) * availableWidth;

      results.push({
        x: currentX,
        y: currentY,
        width: itemWidth,
        height: rowHeight,
        data: item,
      });

      currentX += itemWidth + SDG_GAP;
    });

    currentY += rowHeight + SDG_GAP;
  });

  return results;
}

// Standard squarify for entity sub-treemaps within each SDG
function squarify(
  items: TreemapItem[],
  x: number,
  y: number,
  width: number,
  height: number
): (Rect & { data: TreemapItem })[] {
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
): (Rect & { data: TreemapItem })[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, width, height, data: items[0] }];
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
      ...slice(rightItems, x + leftWidth + GAP, y, width - leftWidth - GAP, height),
    ];
  } else {
    const leftHeight = height * (leftSum / total) - GAP / 2;
    return [
      ...slice(leftItems, x, y, width, leftHeight),
      ...slice(rightItems, x, y + leftHeight + GAP, width, height - leftHeight - GAP),
    ];
  }
}

interface SDGExpensesTreemapProps {
  onSDGClick: (sdgNumber: number) => void;
  searchQuery?: string;
}

export default function SDGExpensesTreemap({
  onSDGClick,
  searchQuery = "",
}: SDGExpensesTreemapProps) {
  const [expensesData, setExpensesData] = useState<SDGExpensesData | null>(
    null
  );

  useEffect(() => {
    fetch("/data/sdg-expenses.json")
      .then((res) => res.json())
      .then(setExpensesData);
  }, []);

  if (!expensesData) return <div>Loading...</div>;

  const searchTerm = searchQuery.toLowerCase().trim();

  // Check if search matches SDG-level criteria (number or short title)
  const matchesSDG = (sdgNumber: number): boolean => {
    if (!searchTerm) return true;
    if (sdgNumber.toString().includes(searchTerm)) return true;
    const shortTitle = SDG_SHORT_TITLES[sdgNumber];
    if (shortTitle && shortTitle.toLowerCase().includes(searchTerm)) return true;
    return false;
  };

  // Filter entities within an SDG based on search query
  const filterEntities = (entities: { [entity: string]: number }): { [entity: string]: number } => {
    if (!searchTerm) return entities;
    
    // If search matches an SDG, show all entities for that SDG
    // Entity filtering only happens when searching by entity name
    const filtered: { [entity: string]: number } = {};
    Object.entries(entities).forEach(([entity, amount]) => {
      if (entity.toLowerCase().includes(searchTerm)) {
        filtered[entity] = amount;
      }
    });
    return filtered;
  };

  // Process expenses: filter entities and recalculate totals
  const processedExpenses: Array<[string, { total: number; entities: { [entity: string]: number }; isEntityFiltered: boolean }]> = [];
  
  Object.entries(expensesData).forEach(([sdg, data]) => {
    const sdgNumber = parseInt(sdg);
    const sdgMatches = matchesSDG(sdgNumber);
    
    if (sdgMatches && !searchTerm) {
      // No search - show everything
      processedExpenses.push([sdg, { ...data, isEntityFiltered: false }]);
    } else if (sdgMatches) {
      // SDG matches search - show all entities
      processedExpenses.push([sdg, { ...data, isEntityFiltered: false }]);
    } else {
      // SDG doesn't match - filter entities
      const filteredEntities = filterEntities(data.entities);
      const filteredTotal = Object.values(filteredEntities).reduce((sum, val) => sum + val, 0);
      
      if (filteredTotal > 0) {
        processedExpenses.push([sdg, { 
          total: filteredTotal, 
          entities: filteredEntities,
          isEntityFiltered: true 
        }]);
      }
    }
  });

  if (processedExpenses.length === 0) {
    return (
      <div className="h-[calc(100vh-320px)] min-h-[600px] w-full">
        <div className="flex h-full w-full items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-500">
            No SDGs match the search criteria
          </p>
        </div>
      </div>
    );
  }

  const sdgItems: TreemapItem[] = processedExpenses
    .map(([sdg, data]) => ({
      name: sdg,
      value: data.total,
    }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name)); // Keep SDGs in order 1-17

  // Create a lookup for processed data
  const processedDataLookup = Object.fromEntries(processedExpenses);

  // Use row-based layout for SDGs (6 per row like the grid)
  const sdgRects = rowBasedLayout(sdgItems, 0, 0, 100, 100, 6);

  // Render entity sub-treemap within an SDG cell (no tooltips, just colored boxes)
  const renderEntities = (
    sdgNumber: number,
    entities: { [entity: string]: number },
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const color = SDG_COLORS[sdgNumber];
    const entityItems = Object.entries(entities)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const rects = squarify(entityItems, x, y, width, height);

    return rects.map((rect, i) => {
      const showLabel = rect.width > 3 && rect.height > 2;

      return (
        <div
          key={`${sdgNumber}-${rect.data.name}-${i}`}
          className="absolute cursor-pointer text-white"
          style={{
            left: `${rect.x}%`,
            top: `${rect.y}%`,
            width: `${rect.width}%`,
            height: `${rect.height}%`,
            backgroundColor: color,
          }}
          onClick={() => onSDGClick(sdgNumber)}
        >
          {showLabel && (
            <div className="flex h-full items-end overflow-hidden p-1">
              <div className="truncate text-xs font-medium leading-tight">
                {rect.data.name}
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-[calc(100vh-320px)] min-h-[600px] w-full">
      <div className="relative h-full w-full bg-gray-100">
        {sdgRects.map((sdgRect) => {
          const sdgNumber = parseInt(sdgRect.data.name);
          const sdgData = processedDataLookup[sdgRect.data.name];
          const color = SDG_COLORS[sdgNumber];
          const shortTitle = SDG_SHORT_TITLES[sdgNumber];

          return (
            <React.Fragment key={`sdg-${sdgNumber}`}>
              {/* Entity sub-treemap */}
              {renderEntities(
                sdgNumber,
                sdgData.entities,
                sdgRect.x,
                sdgRect.y,
                sdgRect.width,
                sdgRect.height
              )}

              {/* SDG label overlay with tooltip */}
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute z-20 cursor-pointer overflow-hidden text-white"
                    style={{
                      left: `${sdgRect.x}%`,
                      top: `${sdgRect.y}%`,
                      width: `${sdgRect.width}%`,
                      height: `${sdgRect.height}%`,
                    }}
                    onClick={() => onSDGClick(sdgNumber)}
                  >
                    {/* Background block that extends to edges */}
                    <div
                      className="absolute left-0 top-0 flex gap-2 p-2"
                      style={{ backgroundColor: color }}
                    >
                      <span className="flex-shrink-0 text-2xl font-bold leading-none sm:text-3xl">
                        {sdgNumber}
                      </span>
                      <div className="flex flex-col">
                        <span className="break-words text-xs font-semibold leading-tight sm:text-sm">
                          {shortTitle}
                        </span>
                        <span className="mt-0.5 text-xs opacity-90 sm:text-sm">
                          {formatBudget(sdgData.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="max-w-xs border border-slate-200 bg-white text-slate-800 shadow-lg sm:max-w-sm"
                >
                  <div className="max-w-xs p-1 text-center sm:max-w-sm">
                    <p className="text-sm font-bold leading-tight sm:text-base">
                      SDG {sdgNumber}: {shortTitle}
                    </p>
                    <p className="mt-1 text-xs leading-tight text-slate-600 sm:text-sm">
                      {SDG_TITLES[sdgNumber]}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      {formatBudget(sdgData.total)}
                    </p>
                    <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                      Click to view details
                    </p>
                    <p className="mt-1 text-xs text-slate-500 sm:hidden">
                      Tap to view details
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
