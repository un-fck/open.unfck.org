"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Entity, Impact } from "@/types";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { formatBudget } from "@/lib/entities";

interface EntitySidebarProps {
  entity: Entity | null;
  budget: number;
  onClose: () => void;
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function EntitySidebar({ entity, budget, onClose }: EntitySidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loadingImpacts, setLoadingImpacts] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Fetch impacts when entity changes
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
        {/* Header */}
        <div className="sticky top-0 border-b border-gray-300 bg-white px-6 pb-2 pt-4 sm:px-8 sm:pb-3 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-2xl">
                {entity.entity}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{entity.entity_long}</p>
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all duration-200 ease-out hover:bg-gray-400 hover:text-gray-100 focus:bg-gray-400 focus:text-gray-100 focus:outline-none"
              aria-label="Close sidebar"
            >
              <X className="h-3 w-3" />
            </button>
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

            <div className="mt-3">
              <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                Total Revenue (2023)
              </span>
              <div className="mt-0.5">
                <div className="text-base font-semibold text-gray-700">
                  {formatBudget(budget)}
                </div>
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
          </div>

          {/* Impact Section */}
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Impact
            </h3>
            {loadingImpacts ? (
              <p className="text-sm text-gray-500">Loading impacts...</p>
            ) : impacts.length > 0 ? (
              <div className="space-y-2">
                {impacts.map((impact) => (
                  <div
                    key={impact.id}
                    className="flex items-start gap-2"
                  >
                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
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
