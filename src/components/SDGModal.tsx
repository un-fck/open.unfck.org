"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatBudget } from "@/lib/entities";
import { SDG } from "@/lib/sdgs";
import { ShareButton } from "@/components/ShareButton";

interface SDGModalProps {
  sdg: SDG | null;
  onClose: () => void;
  color: string;
  entityExpenses?: { [entity: string]: number };
}

export default function SDGModal({
  sdg,
  onClose,
  color,
  entityExpenses,
}: SDGModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showAllEntities, setShowAllEntities] = useState(false);

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

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isRightSwipe) handleClose();
  };

  useEffect(() => {
    const originalOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = originalOverflow;
    };
  }, []);

  if (!sdg) return null;

  // Process entity expenses for display
  const sortedEntities = entityExpenses
    ? Object.entries(entityExpenses)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
    : [];

  const displayedEntities = showAllEntities
    ? sortedEntities
    : sortedEntities.slice(0, 10);

  const maxAmount =
    sortedEntities.length > 0
      ? Math.max(...sortedEntities.map((e) => e.amount))
      : 0;

  const totalExpenses = sortedEntities.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "opacity-100" : "opacity-0"}`}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${isVisible && !isClosing ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="sticky top-0 border-b border-gray-300 bg-white px-4 pb-2 pt-3 sm:px-6 sm:pb-3 sm:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-lg font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {sdg.number}
                </div>
                <h2 className="text-lg font-bold leading-tight text-gray-900 sm:text-xl">
                  {sdg.shortTitle}
                </h2>
              </div>
              <p className="text-xs leading-relaxed text-gray-700 sm:text-sm">
                {sdg.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton hash={`sdg=${sdg.number}`} />
              <button
                onClick={handleClose}
                className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all duration-200 ease-out hover:bg-gray-400 hover:text-gray-100 focus:bg-gray-400 focus:text-gray-100 focus:outline-none"
                aria-label="Close modal"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          {/* Entity Expenses Breakdown */}
          {sortedEntities.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
                Expenses
              </h3>

              <div>
                <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                  Total
                </span>
                <div className="mt-0.5">
                  <div className="text-base font-semibold text-gray-700">
                    {formatBudget(totalExpenses)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                  By Entity
                </span>
                <div className="mt-2 space-y-1.5">
                  {displayedEntities.map((entity) => {
                    const normalizedWidth = (entity.amount / maxAmount) * 100;
                    return (
                      <div
                        key={entity.name}
                        className="flex items-center gap-2"
                      >
                        <span className="w-20 flex-shrink-0 truncate text-left text-xs font-medium text-gray-700">
                          {entity.name}
                        </span>
                        <div className="flex flex-1 flex-col gap-px">
                          <div
                            className="flex h-2 overflow-hidden rounded-sm"
                            style={{ width: `${normalizedWidth}%` }}
                          >
                            <div
                              className="h-full w-full transition-all"
                              style={{ backgroundColor: color }}
                            />
                          </div>
                        </div>
                        <div className="w-20 flex-shrink-0 text-right text-xs text-gray-500">
                          {formatBudget(entity.amount)}
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
          )}

          {/* Targets and Indicators */}
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Targets & Indicators
            </h3>
            <div className="space-y-4">
              {sdg.targets.map((target) => (
                <div key={target.number}>
                  <h4 className="mb-2 text-base font-normal uppercase tracking-wider text-gray-900 sm:text-lg">
                    Target {target.number}
                  </h4>
                  <p className="mb-3 text-xs leading-relaxed text-gray-700 sm:text-sm">
                    {target.description}
                  </p>
                  {target.indicators.length > 0 && (
                    <div className="ml-3 space-y-2">
                      {target.indicators.map((indicator) => (
                        <div
                          key={indicator.number}
                          className="flex items-start gap-2 text-xs sm:text-sm"
                        >
                          <span className="whitespace-nowrap font-semibold text-gray-900">
                            {indicator.number}
                          </span>
                          <span className="leading-relaxed text-gray-700">
                            {indicator.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
