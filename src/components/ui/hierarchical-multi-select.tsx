"use client";

import * as React from "react";
import { ChevronRightIcon, CheckIcon, SearchIcon, X as XIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface HierarchicalGroup {
  id: string;
  label: string;
  bgColor: string;
  children: string[];
}

export interface HierarchicalMultiSelectProps {
  groups: HierarchicalGroup[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  className?: string;
  /** Optional function to get dynamic color for selected items (for use as legend) */
  getItemColor?: (id: string) => string | undefined;
  /** Text shown on add button when nothing selected */
  addLabel?: string;
}

/**
 * Hierarchical multi-select dropdown with two levels:
 * - Level 1: Groups (e.g., "Government", "Non-Government") - selecting shows aggregate
 * - Level 2: Individual items within each group (expandable, collapsed by default)
 * 
 * Selecting a group does NOT auto-select its children.
 * Users can mix group aggregates with individual items.
 * Includes search functionality.
 */
export function HierarchicalMultiSelect({
  groups,
  selected,
  onChange,
  className,
  getItemColor,
  addLabel = "Add",
}: HierarchicalMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");

  const toggleItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onChange(newSelected);
  };

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const selectedCount = selected.size;

  // Filter children based on search query
  const normalizedQuery = searchQuery.toLowerCase().trim();
  const filteredGroups = React.useMemo(() => {
    if (!normalizedQuery) return groups;
    
    return groups.map(group => ({
      ...group,
      children: group.children.filter(child => 
        child.toLowerCase().includes(normalizedQuery)
      ),
      // Also match group label
      matchesLabel: group.label.toLowerCase().includes(normalizedQuery),
    })).filter(group => group.matchesLabel || group.children.length > 0);
  }, [groups, normalizedQuery]);

  // Auto-expand groups when searching
  React.useEffect(() => {
    if (normalizedQuery) {
      setExpandedGroups(new Set(filteredGroups.map(g => g.id)));
    }
  }, [normalizedQuery, filteredGroups]);


  // Get info about a selected item (label and group color)
  const getSelectedItemInfo = (id: string): { label: string; bgColor: string } | null => {
    for (const group of groups) {
      if (group.id === id) {
        return { label: group.label, bgColor: group.bgColor };
      }
      if (group.children.includes(id)) {
        return { label: id, bgColor: group.bgColor };
      }
    }
    return null;
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        {/* Chips row with "+" trigger first for stable positioning */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Add chip trigger - first so it doesn't move when items are added */}
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-center rounded-full bg-gray-100 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-800",
                selectedCount === 0 ? "gap-1 px-2" : "w-[26px]",
                open && "bg-gray-200"
              )}
            >
              <span>+</span>
              {selectedCount === 0 && <span>{addLabel}</span>}
            </button>
          </PopoverTrigger>
          
          {/* Selected items as removable chips (serves as legend when getItemColor is provided) */}
          {Array.from(selected).map((id) => {
            const info = getSelectedItemInfo(id);
            if (!info) return null;
            const dynamicColor = getItemColor?.(id);
            return (
              <button
                key={id}
                onClick={() => {
                  const newSelected = new Set(selected);
                  newSelected.delete(id);
                  onChange(newSelected);
                }}
                className="group flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-2 pr-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-200"
              >
                <span 
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={dynamicColor ? { backgroundColor: dynamicColor } : undefined}
                />
                <span className="max-w-[150px] truncate">{info.label}</span>
                <XIcon className="h-3 w-3 flex-shrink-0 text-gray-400 group-hover:text-gray-600" />
              </button>
            );
          })}
        </div>
      <PopoverContent
        className="w-[320px] border-gray-300 bg-white p-0"
        align="start"
        sideOffset={4}
      >
        {/* Search input - minimal style matching ChartSearchInput */}
        <div className="relative border-b border-gray-200">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`block w-full border-0 bg-transparent py-2 pl-8 text-sm placeholder-gray-400 outline-none ${searchQuery ? "pr-8" : "pr-3"}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Clear search"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-[300px] overflow-y-auto py-1">
          {filteredGroups.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              No results found
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              const hasChildren = group.children.length > 0;
              
              return (
                <div key={group.id}>
                  {/* Group header (selectable for aggregate) */}
                  <div
                    className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => hasChildren && toggleExpanded(group.id)}
                  >
                    {/* Expand/collapse chevron */}
                    <div className="flex-shrink-0 w-4">
                      {hasChildren && (
                        <ChevronRightIcon className={cn(
                          "h-4 w-4 text-gray-400 transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )} />
                      )}
                    </div>
                    
                    {/* Checkbox */}
                    <button
                      className={cn(
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                        selected.has(group.id) 
                          ? cn(group.bgColor, "border-transparent") 
                          : "border-gray-300 bg-white"
                      )}
                      onClick={(e) => toggleItem(group.id, e)}
                    >
                      {selected.has(group.id) && (
                        <CheckIcon className="h-3 w-3 text-white" />
                      )}
                    </button>
                    
                    {/* Color indicator */}
                    <span className={cn("h-4 w-4 flex-shrink-0 rounded", group.bgColor)} />
                    
                    {/* Label */}
                    <span className="flex-1 min-w-0 text-sm font-medium truncate">{group.label}</span>
                    
                    {/* Count */}
                    <span className="flex-shrink-0 text-xs text-gray-500">
                      ({group.children.length})
                    </span>
                  </div>
                  
                  {/* Children (expandable) */}
                  {isExpanded && group.children.map((child) => (
                    <button
                      key={child}
                      className="flex w-full items-center gap-2 pl-10 pr-3 py-1.5 text-left hover:bg-gray-100 transition-colors"
                      onClick={(e) => toggleItem(child, e)}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                        selected.has(child) 
                          ? "bg-gray-700 border-transparent" 
                          : "border-gray-300 bg-white"
                      )}>
                        {selected.has(child) && (
                          <CheckIcon className="h-3 w-3 text-white" />
                        )}
                      </div>
                      
                      {/* Label - no color indicator for individual items */}
                      <span className="flex-1 min-w-0 text-sm truncate">{child}</span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
}
