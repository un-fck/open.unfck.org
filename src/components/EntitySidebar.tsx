"use client";

import { ExternalLink, X } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { useCallback, useEffect, useState } from "react";
import { Entity, Impact, EntityRevenue } from "@/types";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { formatBudget } from "@/lib/entities";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface EntitySidebarProps {
  entity: Entity | null;
  spending: number;
  revenue: EntityRevenue | null;
  onClose: () => void;
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const getContributionTypeColor = (type: string): string => {
  if (type === "Assessed") return "bg-un-blue-muted";
  if (type === "Voluntary un-earmarked") return "bg-un-blue-muted/80";
  if (type === "Voluntary earmarked") return "bg-un-blue-muted/60";
  if (type === "Other") return "bg-un-blue-muted/40";
  return "bg-gray-500";
};

const getContributionTypeOrder = (type: string): number => {
  if (type === "Assessed") return 1;
  if (type === "Voluntary un-earmarked") return 2;
  if (type === "Voluntary earmarked") return 3;
  return 4;
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

export function EntitySidebar({ entity, spending, revenue, onClose }: EntitySidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loadingImpacts, setLoadingImpacts] = useState(true);
  const [showAllDonors, setShowAllDonors] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(!!entity);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!entity?.entity) {
      setImpacts([]);
      setLoadingImpacts(false);
      return;
    }

    setLoadingImpacts(true);
    fetch(`${basePath}/data/impact.json`)
      .then((res) => res.json())
      .then((data: Impact[]) => {
        const entityImpacts = data.filter(
          (impact) => impact.entity === entity.entity
        );
        setImpacts(entityImpacts);
        setLoadingImpacts(false);
      })
      .catch((err) => {
        console.error("Failed to load impacts:", err);
        setImpacts([]);
        setLoadingImpacts(false);
      });
  }, [entity?.entity]);

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

  if (!entity) return null;

  const groupingStyle = getSystemGroupingStyle(entity.system_grouping || "");
  const description = entity.entity_description || entity.entity_long || "";

  // Process revenue breakdown by type
  const revenueByType = revenue?.by_type
    ? Object.entries(revenue.by_type).sort(
        (a, b) => getContributionTypeOrder(a[0]) - getContributionTypeOrder(b[0])
      )
    : [];

  // Process revenue breakdown by donor
  const donorContributions = revenue?.by_donor || [];
  const displayedDonors = showAllDonors
    ? donorContributions
    : donorContributions.slice(0, 10);
  const maxDonorTotal = donorContributions.length > 0
    ? Math.max(...donorContributions.map((d) => d.total))
    : 0;

  const sidebarTitleId = `entity-sidebar-title`;

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
                {entity.entity}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{entity.entity_long}</p>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton hash={`entity=${encodeURIComponent(entity.entity || '')}`} />
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
          {/* Overview Section */}
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Overview
            </h3>
            <div>
              <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                System Grouping
              </span>
              <div className="mt-0.5">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${groupingStyle.bgColor} ${groupingStyle.textColor}`}
                >
                  {groupingStyle.label}
                </span>
              </div>
            </div>

            {description && (
              <div className="mt-3">
                <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                  Description
                </span>
                <div className="mt-0.5">
                  <p className="text-sm leading-relaxed text-gray-700">
                    {description}
                  </p>
                </div>
              </div>
            )}

            {/* SystemChart Link */}
            <div className="mt-4">
              <a
                href={`https://systemchart.un.org/?entity=${entity.entity?.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
              >
                View in UN System Chart
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Financials Section */}
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Financials
            </h3>

            {/* Total Spending */}
            <div>
              <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                Total Expenses
              </span>
              <div className="mt-0.5">
                <div className="text-base font-semibold text-gray-700">
                  {spending > 0 ? formatBudget(spending) : "N/A"}
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="mt-3">
              <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                Total Revenue (2024)
              </span>
              <div className="mt-0.5">
                {revenue ? (
                  <div className="text-base font-semibold text-gray-700">
                    {formatBudget(revenue.total)}
                  </div>
                ) : (
                  <div className="text-sm italic text-gray-500">
                    Revenue data not available at sub-entity level
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Type */}
            {revenue && revenueByType.length > 0 && (
              <div className="mt-4">
                <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                  Revenue by Type
                </span>
                <div className="mt-2 space-y-2">
                  {revenueByType.map(([type, amount]) => (
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
            )}

            {/* Revenue by Donor */}
            {revenue && donorContributions.length > 0 && (
              <div className="mt-4">
                <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                  Revenue by Donor
                </span>
                <div className="mt-2 space-y-1.5">
                  {displayedDonors.map((contrib) => {
                    const typeEntries = Object.entries(contrib)
                      .filter(([key]) => key !== "donor" && key !== "total")
                      .sort(
                        (a, b) =>
                          getContributionTypeOrder(a[0]) -
                          getContributionTypeOrder(b[0])
                      ) as [string, number][];
                    const normalizedWidth = (contrib.total / maxDonorTotal) * 100;

                    return (
                      <div
                        key={contrib.donor}
                        className="flex items-center gap-2"
                      >
                        <span className="w-20 flex-shrink-0 truncate text-left text-xs font-medium text-gray-700">
                          {contrib.donor.replace(
                            "United Kingdom of Great Britain and Northern Ireland",
                            "UK"
                          ).replace("United States of America", "USA")}
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

                  {!showAllDonors && donorContributions.length > 10 && (
                    <button
                      onClick={() => setShowAllDonors(true)}
                      className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
                    >
                      Show all {donorContributions.length} donors
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Impact Section */}
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Impact
            </h3>
            {loadingImpacts ? (
              <p className="text-sm text-gray-500">Loading impacts...</p>
            ) : impacts.length > 0 ? (
              <div className="space-y-3">
                {impacts.map((impact) => (
                  <div
                    key={impact.id}
                    className="flex items-stretch gap-3 rounded-md bg-gray-50 p-3"
                  >
                    <div className="w-1.5 flex-shrink-0 rounded-sm bg-un-blue" />
                    <p className="text-sm leading-relaxed text-gray-700">
                      {impact.impact}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-gray-500">
                No impact data available for this entity.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
