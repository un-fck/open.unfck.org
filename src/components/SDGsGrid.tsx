"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import SDGModal from "./SDGModal";
import SDGExpensesTreemap from "./SDGExpensesTreemap";
import { YearSlider } from "@/components/YearSlider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { formatBudget } from "@/lib/entities";
import { generateYearRange, YEAR_RANGES } from "@/lib/data";
import {
  SDG,
  SDGExpensesData,
  SDG_COLORS,
} from "@/lib/sdgs";

const SDG_YEARS = generateYearRange(YEAR_RANGES.sdgExpenses.min, YEAR_RANGES.sdgExpenses.max);

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function SDGsGrid() {
  const [sdgs, setSdgs] = useState<SDG[]>([]);
  const [selectedSDG, setSelectedSDG] = useState<SDG | null>(null);
  const [showSpending, setShowSpending] = useState<boolean>(true);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [displaySpending, setDisplaySpending] = useState<boolean>(true);
  const [expensesData, setExpensesData] = useState<SDGExpensesData | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(YEAR_RANGES.sdgExpenses.default);

  useEffect(() => {
    fetch(`${basePath}/data/sdgs.json`)
      .then((res) => res.json())
      .then(setSdgs);
  }, []);

  useEffect(() => {
    fetch(`${basePath}/data/sdg-expenses-${selectedYear}.json`)
      .then((res) => res.json())
      .then(setExpensesData);
  }, [selectedYear]);

  const toggleView = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDisplaySpending((prev) => !prev);
    setTimeout(() => setShowSpending((prev) => !prev), 400);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const handleSDGClick = (sdgNumber: number) => {
    const sdg = sdgs.find((s) => s.number === sdgNumber);
    if (sdg) setSelectedSDG(sdg);
  };

  const handleReset = () => {
    setSearchQuery("");
  };

  // Filter SDGs based on search query (by SDG number, short title, or entity abbreviation)
  const filterSDGs = (query: string): SDG[] => {
    if (!query.trim()) return sdgs;
    const searchTerm = query.toLowerCase().trim();

    return sdgs.filter((sdg) => {
      // Match by SDG number
      if (sdg.number.toString().includes(searchTerm)) return true;

      // Match by SDG short title
      if (sdg.shortTitle.toLowerCase().includes(searchTerm)) return true;

      // Match by entity abbreviation in expenses data
      if (expensesData) {
        const sdgExpenses = expensesData[sdg.number.toString()];
        if (sdgExpenses?.entities) {
          const entityMatch = Object.keys(sdgExpenses.entities).some(
            (entity) => entity.toLowerCase().includes(searchTerm)
          );
          if (entityMatch) return true;
        }
      }

      return false;
    });
  };

  const filteredSDGs = filterSDGs(searchQuery);
  const isResetNeeded = searchQuery.trim() !== "";

  return (
    <>
      {/* Filter Controls */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                <svg
                  className="h-3.5 w-3.5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by SDG or entity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block h-9 w-full rounded-none border-0 border-b border-gray-300 bg-transparent py-1.5 pl-8 pr-3 text-sm placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0"
              />
            </div>

            {/* Reset Button */}
            {isResetNeeded && (
              <button
                onClick={handleReset}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all duration-200 ease-out hover:bg-gray-400 hover:text-gray-100 focus:bg-gray-400 focus:text-gray-100 focus:outline-none"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Year Slider */}
            <YearSlider
              years={SDG_YEARS}
              selectedYear={selectedYear}
              onChange={setSelectedYear}
            />

            {/* Goals/Spending Toggle */}
            <div className="flex h-9 items-center gap-2">
              <span
                className={`text-sm ${!showSpending ? "font-medium text-gray-900" : "text-gray-500"}`}
              >
                Goals
              </span>
              <Switch
                checked={showSpending}
                onCheckedChange={(checked) => {
                  if (isAnimating) return;
                  setIsAnimating(true);
                  setDisplaySpending(checked);
                  setTimeout(() => setShowSpending(checked), 400);
                  setTimeout(() => setIsAnimating(false), 800);
                }}
                aria-label="Toggle between goals and spending"
              />
              <span
                className={`text-sm ${showSpending ? "font-medium text-gray-900" : "text-gray-500"}`}
              >
                Spending
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Animated View Container */}
      <div className="relative w-full" data-view-container>
        <div
          className="transition-opacity duration-500 ease-in-out"
          style={{ opacity: displaySpending === showSpending ? 1 : 0 }}
        >
          {showSpending ? (
            <SDGExpensesTreemap
              onSDGClick={handleSDGClick}
              searchQuery={searchQuery}
              year={selectedYear}
            />
          ) : (
            <>
              {filteredSDGs.length === 0 ? (
                <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
                  <p className="text-lg text-gray-500">
                    No SDGs match the search criteria
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
                  {filteredSDGs.map((sdg) => (
                    <Tooltip key={sdg.number} delayDuration={50}>
                      <TooltipTrigger asChild>
                        <div
                          className="relative aspect-square cursor-pointer overflow-hidden transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                          onClick={() => setSelectedSDG(sdg)}
                          style={{ backgroundColor: SDG_COLORS[sdg.number] }}
                        >
                          <div className="flex h-full w-full items-start p-4 text-white">
                            <div className="mr-2 text-2xl font-bold sm:text-3xl">
                              {sdg.number}
                            </div>
                            <div className="pt-0.5 text-left text-xs font-semibold leading-tight sm:text-sm">
                              {sdg.shortTitle}
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
                            SDG {sdg.number}: {sdg.shortTitle}
                          </p>
                          <p className="mt-1 text-xs leading-tight text-slate-600 sm:text-sm">
                            {sdg.title}
                          </p>
                          {expensesData?.[sdg.number.toString()]?.total && (
                            <p className="mt-1 text-xs font-semibold text-slate-600">
                              {formatBudget(expensesData[sdg.number.toString()].total)}
                            </p>
                          )}
                          <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                            Click to view details
                          </p>
                          <p className="mt-1 text-xs text-slate-500 sm:hidden">
                            Tap to view details
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedSDG && (
        <SDGModal
          sdg={selectedSDG}
          onClose={() => setSelectedSDG(null)}
          color={SDG_COLORS[selectedSDG.number]}
          entityExpenses={
            expensesData?.[selectedSDG.number.toString()]?.entities
          }
        />
      )}
    </>
  );
}
