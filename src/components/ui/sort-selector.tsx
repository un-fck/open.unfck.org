"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SortOption = { value: string; label: string };

interface SortSelectorProps {
  options: SortOption[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SortSelector({ options, selected, onChange, className }: SortSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedLabel = options.find(o => o.value === selected)?.label || selected;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors",
            className
          )}
        >
          <span>{selectedLabel}</span>
          <ChevronDownIcon className={cn("h-3 w-3 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[120px] p-1 border-gray-300 bg-white" align="end" sideOffset={4}>
        <div className="flex flex-col">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "px-3 py-1.5 text-xs text-left rounded transition-colors",
                opt.value === selected
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
