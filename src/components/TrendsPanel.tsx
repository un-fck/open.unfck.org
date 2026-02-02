"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TrendsPanelProps {
  children: React.ReactNode;
  onOpen?: () => void;
  className?: string;
}

/**
 * Collapsible panel for trend charts.
 * Collapsed by default to avoid overwhelming users.
 * Triggers onOpen callback when first expanded (for lazy loading data).
 */
export function TrendsPanel({ children, onOpen, className }: TrendsPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hasOpened, setHasOpened] = React.useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !hasOpened) {
      setHasOpened(true);
      onOpen?.();
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className={className}>
      <CollapsibleTrigger className="group mt-6 flex items-center gap-2 text-base font-medium text-un-blue hover:text-un-blue-dark transition-colors">
        <span>View trends</span>
        <ChevronDownIcon className={cn(
          "h-5 w-5 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        <div className="pb-6">
          {hasOpened && children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
