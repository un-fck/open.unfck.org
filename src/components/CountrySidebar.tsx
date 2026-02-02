"use client";

import { X } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { useCallback, useEffect, useState } from "react";
import { formatBudget } from "@/lib/entities";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface CountrySidebarProps {
  country: {
    iso3: string;
    name: string;
    total: number;
    entities: Record<string, number>;
  };
  onClose: () => void;
}

const formatBudgetFixed = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  } else if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`;
  }
  return `$${amount.toFixed(2)}`;
};

export function CountrySidebar({ country, onClose }: CountrySidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showAllEntities, setShowAllEntities] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) =>
    setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    if (touchStart - touchEnd < -minSwipeDistance) handleClose();
  };

  useEffect(() => {
    const originalOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = originalOverflow;
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  // Sort entities by amount descending
  const sortedEntities = Object.entries(country.entities).sort(
    (a, b) => b[1] - a[1]
  );
  const displayedEntities = showAllEntities
    ? sortedEntities
    : sortedEntities.slice(0, 10);
  const maxEntityTotal =
    sortedEntities.length > 0 ? sortedEntities[0][1] : 0;

  const sidebarTitleId = `country-sidebar-title`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "opacity-100" : "opacity-0"}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={sidebarTitleId}
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${isVisible && !isClosing ? "translate-x-0" : "translate-x-full"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-gray-300 bg-white px-6 pb-2 pt-4 sm:px-8 sm:pb-3 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 id={sidebarTitleId} className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-2xl">
                {country.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{country.iso3}</p>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton hash={`country=${encodeURIComponent(country.iso3)}`} />
              <button
                onClick={handleClose}
                className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all duration-200 ease-out hover:bg-gray-400 hover:text-gray-100 focus:bg-gray-400 focus:text-gray-100 focus:outline-none"
                aria-label="Close sidebar"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
          {/* Summary stats */}
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                  Total Spending (2023)
                </span>
                <div className="mt-0.5 text-xl font-bold text-gray-900">
                  {formatBudget(country.total)}
                </div>
              </div>
              <div>
                <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                  Entities Active
                </span>
                <div className="mt-0.5 text-lg font-semibold text-gray-700">
                  {sortedEntities.length}
                </div>
              </div>
            </div>
          </div>

          {/* Spending by Entity */}
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Spending by Entity
            </h3>
            <div className="space-y-2">
              {displayedEntities.map(([entity, amount]) => {
                const normalizedWidth = (amount / maxEntityTotal) * 100;
                return (
                  <div key={entity} className="flex items-center gap-2">
                    <span className="w-20 flex-shrink-0 truncate text-left text-xs font-medium text-gray-700">
                      {entity}
                    </span>
                    <div className="flex flex-1 flex-col gap-px">
                      <div
                        className="h-2 rounded-sm bg-un-blue transition-all"
                        style={{ width: `${normalizedWidth}%` }}
                      />
                    </div>
                    <div className="w-20 flex-shrink-0 text-right text-xs text-gray-500">
                      {formatBudgetFixed(amount)}
                    </div>
                  </div>
                );
              })}

              {!showAllEntities && sortedEntities.length > 10 && (
                <button
                  onClick={() => setShowAllEntities(true)}
                  className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
                >
                  Show all {sortedEntities.length} entities
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
