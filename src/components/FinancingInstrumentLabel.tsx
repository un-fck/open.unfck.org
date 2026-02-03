"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FINANCING_INSTRUMENT_TOOLTIPS,
  getFinancingInstrumentColor,
} from "@/lib/financingInstruments";

interface FinancingInstrumentLabelProps {
  type: string;
  className?: string;
}

export function FinancingInstrumentLabel({ type, className }: FinancingInstrumentLabelProps) {
  const tooltip = FINANCING_INSTRUMENT_TOOLTIPS[type];
  const color = getFinancingInstrumentColor(type);

  if (!tooltip) {
    return (
      <div className={`flex items-center gap-2 ${className || ""}`}>
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm text-gray-600">{type}</span>
      </div>
    );
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div className={`flex cursor-help items-center gap-2 ${className || ""}`}>
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm text-gray-600 underline decoration-dotted underline-offset-2">{type}</span>
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
