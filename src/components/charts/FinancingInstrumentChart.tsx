"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FINANCING_INSTRUMENT_COLORS,
  FINANCING_INSTRUMENT_TOOLTIPS,
  getFinancingInstrumentColor,
} from "@/lib/financingInstruments";
import { formatBudget } from "@/lib/contributors";

export interface FinancingInstrumentDataPoint {
  year: string;
  Assessed?: number;
  "Voluntary un-earmarked"?: number;
  "Voluntary earmarked"?: number;
  Other?: number;
}

interface FinancingInstrumentChartProps {
  data: FinancingInstrumentDataPoint[];
  height?: number;
  showLegend?: boolean;
  compact?: boolean;
}

const formatYAxis = (value: number) => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value}`;
};

const formatTooltipValue = (value: number | undefined) => {
  if (value === undefined) return "";
  return formatBudget(value);
};

function LegendChip({ type, color }: { type: string; color: string }) {
  const tooltip = FINANCING_INSTRUMENT_TOOLTIPS[type];
  
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div className="flex cursor-help items-center gap-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span>{type}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        sideOffset={4}
        className="max-w-[250px] border border-slate-200 bg-white text-slate-800 shadow-lg"
      >
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function FinancingInstrumentChart({
  data,
  height = 280,
  showLegend = true,
  compact = false,
}: FinancingInstrumentChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const chartHeight = compact ? 180 : height;

  return (
    <div className="flex flex-col">
      {showLegend && (
        <div className="mb-3 flex flex-wrap gap-2">
          <LegendChip type="Assessed" color={FINANCING_INSTRUMENT_COLORS.assessed} />
          <LegendChip type="Voluntary un-earmarked" color={FINANCING_INSTRUMENT_COLORS.voluntary_unearmarked} />
          <LegendChip type="Voluntary earmarked" color={FINANCING_INSTRUMENT_COLORS.voluntary_earmarked} />
          {data.some(d => d.Other && d.Other > 0) && (
            <LegendChip type="Other" color={FINANCING_INSTRUMENT_COLORS.other} />
          )}
        </div>
      )}
      <div style={{ height: chartHeight }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: compact ? 10 : 12 }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              orientation="right"
              width={1}
              tick={{ fontSize: compact ? 9 : 11, fill: "#6b7280", dx: -5, dy: -8 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              tickFormatter={formatYAxis}
              mirror
            />
            <RechartsTooltip
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
              stroke={getFinancingInstrumentColor("Assessed")}
              fill={getFinancingInstrumentColor("Assessed")}
            />
            <Area
              type="monotone"
              dataKey="Voluntary un-earmarked"
              stackId="1"
              stroke={getFinancingInstrumentColor("Voluntary un-earmarked")}
              fill={getFinancingInstrumentColor("Voluntary un-earmarked")}
            />
            <Area
              type="monotone"
              dataKey="Voluntary earmarked"
              stackId="1"
              stroke={getFinancingInstrumentColor("Voluntary earmarked")}
              fill={getFinancingInstrumentColor("Voluntary earmarked")}
            />
            {data.some(d => d.Other && d.Other > 0) && (
              <Area
                type="monotone"
                dataKey="Other"
                stackId="1"
                stroke={getFinancingInstrumentColor("Other")}
                fill={getFinancingInstrumentColor("Other")}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
