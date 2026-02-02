"use client";

import * as React from "react";
import {
  LineChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { HierarchicalMultiSelect, HierarchicalGroup } from "@/components/ui/hierarchical-multi-select";
import { formatBudget } from "@/lib/contributors";

// Revenue type colors (matching the treemap opacity pattern)
const REVENUE_TYPE_COLORS = {
  assessed: "#009edb",           // UN blue - full opacity
  voluntary_unearmarked: "#4db8e8", // UN blue - lighter
  voluntary_earmarked: "#99d6f2",   // UN blue - lightest
};

// Type for the contributor trends data
interface ContributorYearData {
  year: number;
  total: number;
  assessed: number;
  voluntary_earmarked: number;
  voluntary_unearmarked: number;
}

interface ContributorTrendsData {
  meta: {
    years: number[];
    governmentContributors: string[];
    nonGovContributors: string[];
  };
  aggregates: {
    gov: ContributorYearData[];
    "non-gov": ContributorYearData[];
    all: ContributorYearData[];
  };
  contributors: Record<string, ContributorYearData[]>;
}

// Color palette for lines - designed for good contrast
const LINE_COLORS = [
  "#009edb", // UN blue
  "#2d6a7e", // UN blue dark
  "#4a7c7e", // faded jade  
  "#7d8471", // camouflage green
  "#9b7c6b", // au chico
  "#3d5a6c", // UN blue slate
  "#4a90a4", // UN blue muted
  "#6b7280", // gray
  "#1e3a5f", // navy
  "#5c8a4d", // forest green
];

export function ContributorTrendsChart() {
  const [data, setData] = React.useState<ContributorTrendsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set(["gov", "non-gov"]));

  // Load data on mount
  React.useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/data/contributor-trends.json");
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error("Failed to load contributor trends:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Build hierarchical groups from loaded data
  const groups: HierarchicalGroup[] = React.useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "gov",
        label: "Government",
        bgColor: "bg-un-blue",
        children: data.meta.governmentContributors,
      },
      {
        id: "non-gov",
        label: "Non-Government",
        bgColor: "bg-faded-jade",
        children: data.meta.nonGovContributors,
      },
    ];
  }, [data]);

  // Transform data for the chart based on selection
  const chartData = React.useMemo(() => {
    if (!data) return [];
    
    const years = data.meta.years;
    return years.map((year, idx) => {
      const point: Record<string, number | string> = { year: year.toString() };
      
      // Add data for each selected item
      Array.from(selected).forEach((id) => {
        if (id === "gov") {
          point["Government"] = data.aggregates.gov[idx]?.total || 0;
        } else if (id === "non-gov") {
          point["Non-Government"] = data.aggregates["non-gov"][idx]?.total || 0;
        } else if (data.contributors[id]) {
          point[id] = data.contributors[id][idx]?.total || 0;
        }
      });
      
      return point;
    });
  }, [data, selected]);

  // Get line configurations and color map based on selection
  const { lines, colorMap } = React.useMemo(() => {
    const result: { dataKey: string; color: string; name: string }[] = [];
    const colors: Record<string, string> = {};
    let colorIdx = 0;
    
    Array.from(selected).forEach((id) => {
      let name: string;
      if (id === "gov") {
        name = "Government";
      } else if (id === "non-gov") {
        name = "Non-Government";
      } else {
        name = id;
      }
      
      const color = LINE_COLORS[colorIdx % LINE_COLORS.length];
      colors[id] = color;
      
      result.push({
        dataKey: name,
        color,
        name,
      });
      colorIdx++;
    });
    
    return { lines: result, colorMap: colors };
  }, [selected]);

  // Get color for a selected item (passed to HierarchicalMultiSelect for legend chips)
  const getItemColor = React.useCallback((id: string) => colorMap[id], [colorMap]);

  // Custom tooltip formatter
  const formatTooltipValue = (value: number) => {
    return formatBudget(value);
  };

  // Data for stacked area chart (revenue types for all contributors)
  const revenueTypeData = React.useMemo(() => {
    if (!data) return [];
    return data.aggregates.all.map((item) => ({
      year: item.year.toString(),
      Assessed: item.assessed,
      "Voluntary un-earmarked": item.voluntary_unearmarked,
      "Voluntary earmarked": item.voluntary_earmarked,
    }));
  }, [data]);

  return (
    <>
      {/* Charts container - flex row on large screens */}
      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:gap-6">
        {/* Chart A: Compare contributors (line chart) */}
        <div className="w-full lg:w-1/2">
          <div className="space-y-3">
            {/* Title and chips */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Compare contributors
              </h4>
              <HierarchicalMultiSelect
                groups={groups}
                selected={selected}
                onChange={setSelected}
                getItemColor={getItemColor}
                addLabel="Add"
              />
            </div>

            {/* Chart */}
            <div className="h-[280px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Loading trends...
                </div>
              ) : selected.size === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Select at least one contributor to view trends
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      orientation="right"
                      width={45}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 'auto']}
                      tickFormatter={(value) => {
                        if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
                        if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
                        return `$${value}`;
                      }}
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelFormatter={(label) => `Year: ${label}`}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    />
                    {lines.map((line) => (
                      <Line
                        key={line.dataKey}
                        type="monotone"
                        dataKey={line.dataKey}
                        stroke={line.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Chart B: Revenue types (stacked area chart) */}
        <div className="w-full lg:w-1/2">
          <div className="space-y-3">
            {/* Title and legend */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Revenue by type
              </h4>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 px-2 text-xs text-gray-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REVENUE_TYPE_COLORS.assessed }} />
                  <span>Assessed</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 px-2 text-xs text-gray-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REVENUE_TYPE_COLORS.voluntary_unearmarked }} />
                  <span>Voluntary un-earmarked</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 px-2 text-xs text-gray-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REVENUE_TYPE_COLORS.voluntary_earmarked }} />
                  <span>Voluntary earmarked</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[280px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Loading trends...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenueTypeData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      orientation="right"
                      width={45}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 'auto']}
                      tickFormatter={(value) => {
                        if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
                        if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
                        return `$${value}`;
                      }}
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelFormatter={(label) => `Year: ${label}`}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Assessed"
                      stackId="1"
                      stroke={REVENUE_TYPE_COLORS.assessed}
                      fill={REVENUE_TYPE_COLORS.assessed}
                    />
                    <Area
                      type="monotone"
                      dataKey="Voluntary un-earmarked"
                      stackId="1"
                      stroke={REVENUE_TYPE_COLORS.voluntary_unearmarked}
                      fill={REVENUE_TYPE_COLORS.voluntary_unearmarked}
                    />
                    <Area
                      type="monotone"
                      dataKey="Voluntary earmarked"
                      stackId="1"
                      stroke={REVENUE_TYPE_COLORS.voluntary_earmarked}
                      fill={REVENUE_TYPE_COLORS.voluntary_earmarked}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
