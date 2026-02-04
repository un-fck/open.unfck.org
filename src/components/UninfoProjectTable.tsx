"use client";

import { useState } from "react";
import { UninfoProject } from "@/lib/data";
import { UninfoFundingBar } from "@/components/UninfoFundingBar";
import { SDG_COLORS } from "@/lib/sdgs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UninfoProjectTableProps {
  projects: UninfoProject[];
  initialLimit?: number;
}

export function UninfoProjectTable({ projects, initialLimit = 5 }: UninfoProjectTableProps) {
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? projects : projects.slice(0, initialLimit);
  const maxRequired = displayed.length > 0 ? Math.max(...displayed.map(p => p.required)) : 1;
  const formatAmt = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}K`;

  if (projects.length === 0) {
    return <p className="text-xs text-gray-500">No projects found.</p>;
  }

  return (
    <div className="space-y-2">
      {displayed.map(project => {
        const barWidth = (project.required / maxRequired) * 100;
        const availPct = project.required > 0 ? (project.available / project.required) * 100 : 0;
        const spentPct = project.required > 0 ? (project.spent / project.required) * 100 : 0;

        return (
          <div key={project.id} className="rounded border border-gray-200 p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{project.agency}</span>
                  {project.sdg && (
                    <>
                      <span>·</span>
                      <div
                        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                        style={{ backgroundColor: SDG_COLORS[project.sdg] }}
                      >
                        {project.sdg}
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-900 line-clamp-2" title={project.name}>
                  {project.name}
                </p>
              </div>
              <div className="flex-shrink-0 text-right text-xs text-gray-600">
                {formatAmt(project.available)}
              </div>
            </div>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="mt-2 cursor-default">
                  <div
                    className="relative h-2 overflow-hidden rounded-sm bg-gray-200"
                    style={{ width: `${barWidth}%` }}
                  >
                    <div className="absolute inset-y-0 left-0 bg-un-blue/30" style={{ width: `${availPct}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-un-blue" style={{ width: `${spentPct}%` }} />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="border border-slate-200 bg-white text-slate-800 shadow-lg p-3">
                <UninfoFundingBar
                  required={project.required}
                  available={project.available}
                  spent={project.spent}
                  compact
                />
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}

      {!showAll && projects.length > initialLimit && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-gray-600 underline hover:text-gray-900"
        >
          Show all {projects.length} projects
        </button>
      )}
    </div>
  );
}
