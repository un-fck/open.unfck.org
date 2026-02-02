"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Contributor,
  formatBudget,
  getContributionTypeOrder,
  getStatusStyle,
  getTotalContributions,
} from "@/lib/contributors";
import { ShareButton } from "@/components/ShareButton";

interface ContributorSidebarProps {
  contributor: Contributor | null;
  onClose: () => void;
}

const getContributionBreakdown = (
  contributions: Record<string, Record<string, number>>
): Record<string, number> => {
  const breakdown: Record<string, number> = {};
  Object.values(contributions).forEach((entityContribs) => {
    Object.entries(entityContribs).forEach(([type, amount]) => {
      breakdown[type] = (breakdown[type] || 0) + amount;
    });
  });
  return breakdown;
};

const getContributionTypeColor = (type: string): string => {
  if (type === "Assessed") return "bg-un-blue-muted";
  if (type === "Voluntary un-earmarked") return "bg-un-blue-muted/80";
  if (type === "Voluntary earmarked") return "bg-un-blue-muted/60";
  if (type === "Other") return "bg-un-blue-muted/40";
  return "bg-gray-500";
};

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

export function ContributorSidebar({
  contributor,
  onClose,
}: ContributorSidebarProps) {
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

  if (!contributor) return null;

  const statusStyle = getStatusStyle(contributor.status);
  const totalContributions = getTotalContributions(contributor.contributions);
  const breakdown = getContributionBreakdown(contributor.contributions);
  const breakdownEntries = Object.entries(breakdown).sort(
    (a, b) => getContributionTypeOrder(a[0]) - getContributionTypeOrder(b[0])
  );

  const entityContributions = Object.entries(contributor.contributions)
    .map(([entity, types]) => {
      const total = Object.values(types).reduce((sum, val) => sum + val, 0);
      return {
        entity,
        total,
        typeBreakdown: types,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "opacity-100" : "opacity-0"}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${isVisible && !isClosing ? "translate-x-0" : "translate-x-full"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="sticky top-0 border-b border-gray-300 bg-white px-6 pb-2 pt-4 sm:px-8 sm:pb-3 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="flex-1 text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-2xl">
              {contributor.name}
            </h2>
            <div className="flex items-center gap-2">
              <ShareButton hash={`donor=${encodeURIComponent(contributor.name)}`} />
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

        <div className="space-y-6 px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Overview
            </h3>
            <div>
              <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                Status
              </span>
              <div className="mt-0.5">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${statusStyle.bgColor} ${statusStyle.textColor}`}
                >
                  {statusStyle.label}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Contributions
            </h3>

            <div className="mt-3">
              <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                Total
              </span>
              <div className="mt-0.5">
                <div className="text-base font-semibold text-gray-700">
                  {formatBudget(totalContributions)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                By Type
              </span>
              <div className="mt-2 space-y-2">
                {breakdownEntries.map(([type, amount]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${getContributionTypeColor(type)}`}
                      />
                      <span className="text-sm text-gray-600">{type}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatBudget(amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                By Entity
              </span>
              <div className="mt-2 space-y-1.5">
                {(() => {
                  const displayedEntities = showAllEntities
                    ? entityContributions
                    : entityContributions.slice(0, 10);
                  const maxTotal = Math.max(
                    ...entityContributions.map((c) => c.total)
                  );

                  return (
                    <>
                      {displayedEntities.map((contrib) => {
                        const typeEntries = Object.entries(
                          contrib.typeBreakdown
                        ).sort(
                          (a, b) =>
                            getContributionTypeOrder(a[0]) -
                            getContributionTypeOrder(b[0])
                        );
                        const normalizedWidth = (contrib.total / maxTotal) * 100;

                        return (
                          <div
                            key={contrib.entity}
                            className="flex items-center gap-2"
                          >
                            <span className="w-20 flex-shrink-0 truncate text-left text-xs font-medium text-gray-700">
                              {contrib.entity}
                            </span>
                            <div className="flex flex-1 flex-col gap-px">
                              <div
                                className="flex h-2 overflow-hidden rounded-sm"
                                style={{ width: `${normalizedWidth}%` }}
                              >
                                {typeEntries.map(([type, amount]) => {
                                  const typePercentage =
                                    (amount / contrib.total) * 100;
                                  return typePercentage > 0 ? (
                                    <div
                                      key={type}
                                      className={`${getContributionTypeColor(type)} transition-all`}
                                      style={{ width: `${typePercentage}%` }}
                                    />
                                  ) : null;
                                })}
                              </div>
                            </div>
                            <div className="w-20 flex-shrink-0 text-right text-xs text-gray-500">
                              {formatBudgetFixed(contrib.total)}
                            </div>
                          </div>
                        );
                      })}

                      {!showAllEntities && entityContributions.length > 10 && (
                        <button
                          onClick={() => setShowAllEntities(true)}
                          className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
                        >
                          Show all {entityContributions.length} entities
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
