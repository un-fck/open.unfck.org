"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { FrameworkNode } from "@/lib/data";
import { UninfoFundingBar } from "@/components/UninfoFundingBar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const UN_BLUE = "#009edb";

// Extract leading number/code from name (e.g., "1", "1.2", "[1]", "Output 1.2.3:")
function extractCode(name: string): { code: string | null; text: string } {
  // Match patterns like "[1.2]", "1.2", "1", "Output 1.2.3:", "Outcome 1:" at start
  const match = name.match(/^(?:\[?([\d.]+)\]?[:\s-]*|(?:Output|Outcome|Effet)\s*([\d.]+)[:\s-]*)/i);
  if (match) {
    const code = (match[1] || match[2]).replace(/[.:]+$/, ""); // Strip trailing dots/colons
    const text = name.slice(match[0].length).trim();
    return { code, text };
  }
  return { code: null, text: name };
}

// Convert all-uppercase text to title case
function toTitleCase(text: string): string {
  // Check if text is mostly uppercase (>70% uppercase letters)
  const letters = text.replace(/[^a-zA-Z]/g, "");
  const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
  if (letters.length > 3 && uppercaseCount / letters.length > 0.7) {
    return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  return text;
}

// Code badge component
function CodeBadge({ code }: { code: string }) {
  return (
    <span
      className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-[9px] font-bold min-w-[20px] h-5 px-1"
      style={{ backgroundColor: UN_BLUE }}
    >
      {code}
    </span>
  );
}

interface FrameworkNodeProps {
  node: FrameworkNode;
  level: number;
  maxRequired: number;
}

function FrameworkNodeItem({ node, level, maxRequired }: FrameworkNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  // Calculate child max for nested bars
  const childMax = node.children?.reduce((max, c) => Math.max(max, c.required), 0) || 0;

  // Nested bar calculations
  const barWidth = maxRequired > 0 ? (node.required / maxRequired) * 100 : 0;
  const availPct = node.required > 0 ? (node.available / node.required) * 100 : 0;
  const spentPct = node.required > 0 ? (node.spent / node.required) * 100 : 0;

  // Extract code from name for display
  const extractedCode = node.code?.replace(/[.:]+$/, "") || extractCode(node.name).code;
  const displayCode = extractedCode;
  const rawName = node.code ? node.name : extractCode(node.name).text;
  const displayName = toTitleCase(rawName);

  return (
    <div className={level > 0 ? "ml-3 border-l border-gray-200 pl-3" : ""}>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            onClick={() => hasChildren && setExpanded(!expanded)}
            className={`w-full text-left rounded-lg bg-gray-50 p-2 mb-1 ${hasChildren ? "cursor-pointer hover:bg-gray-100" : "cursor-default"}`}
          >
            {/* Top row: chevron + circle + bar */}
            <div className="flex items-center gap-2">
              {hasChildren && (
                <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`} />
              )}
              {!hasChildren && <span className="w-3 flex-shrink-0" />}
              {displayCode && <CodeBadge code={displayCode} />}
              {!displayCode && <span className="w-5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div
                  className="relative h-2 overflow-hidden rounded-sm bg-gray-200"
                  style={{ width: `${barWidth}%`, minWidth: "20px" }}
                >
                  <div className="absolute inset-y-0 left-0 opacity-30" style={{ width: `${availPct}%`, backgroundColor: UN_BLUE }} />
                  <div className="absolute inset-y-0 left-0" style={{ width: `${spentPct}%`, backgroundColor: UN_BLUE }} />
                </div>
              </div>
            </div>
            {/* Bottom row: text aligned with bar */}
            <div className="mt-1.5 ml-[calc(12px+8px+20px+8px)]">
              <span className="text-xs font-medium text-gray-700 line-clamp-2">
                {displayName}
              </span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="border border-slate-200 bg-white text-slate-800 shadow-lg p-3 max-w-xs">
          <div className="flex items-start gap-2 mb-2">
            {displayCode && <CodeBadge code={displayCode} />}
            <p className="font-medium text-xs">{displayName}</p>
          </div>
          <UninfoFundingBar
            required={node.required}
            available={node.available}
            spent={node.spent}
            compact
          />
        </TooltipContent>
      </Tooltip>

      {expanded && hasChildren && (
        <div className="mt-1">
          {node.children!.map((child) => (
            <FrameworkNodeItem key={child.id} node={child} level={level + 1} maxRequired={childMax} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ResultsFrameworkProps {
  framework: FrameworkNode[];
}

export function ResultsFramework({ framework }: ResultsFrameworkProps) {
  if (!framework || framework.length === 0) return null;

  const maxRequired = framework.reduce((max, sp) => Math.max(max, sp.required), 0);

  return (
    <div className="space-y-1">
      {framework.map((sp) => (
        <FrameworkNodeItem key={sp.id} node={sp} level={0} maxRequired={maxRequired} />
      ))}
    </div>
  );
}
