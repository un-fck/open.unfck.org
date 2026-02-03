"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface YearSelectorProps {
  years: number[];
  selected: number;
  onChange: (year: number) => void;
  className?: string;
}

export function YearSelector({ years, selected, onChange, className }: YearSelectorProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors",
            "border-b border-gray-400 hover:border-gray-600",
            className
          )}
        >
          <span className="font-medium">{selected}</span>
          <ChevronDownIcon className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto min-w-[80px] p-1 border-gray-300 bg-white"
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => { onChange(year); setOpen(false); }}
              className={cn(
                "px-3 py-1.5 text-sm text-left rounded transition-colors",
                year === selected
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
