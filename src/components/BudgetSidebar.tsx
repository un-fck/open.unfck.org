"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  GroupedTreemap,
  type GroupedTreemapLeaf,
  type GroupedTreemapRow,
  type GroupedTreemapSegment,
  type GroupedTreemapSubgroup,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import type {
  BudgetFundingSource,
  BudgetMetricKey,
  BudgetMeta,
  BudgetNode,
  BudgetNodeSource,
} from "@/types";
import { formatBudget } from "@/lib/entities";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { SidebarControls } from "@/components/SidebarControls";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BUDGET_FUNDING_SOURCES,
  FUNDING_SHADE_OPACITY,
  FUNDING_SOURCES,
} from "@/lib/budgetGroupings";
import { BAND_PALETTE } from "@/lib/secretariatGroupings";
import { ProgrammeBudgetNodeTrend } from "@/components/ProgrammeBudgetNodeTrend";

interface BudgetSidebarProps {
  node: BudgetNode;
  parent: BudgetNode | null;
  childrenByParent: Record<string, BudgetNode[]>;
  meta: BudgetMeta;
  hashPrefix: string;
  dataset?: string;
  years?: number[];
  onClose: () => void;
}

const KIND_NAMES: Partial<Record<BudgetNode["kind"], string>> = {
  whole: "Total",
  part: "Budget part",
  entity: "Entity",
  programme: "Programme",
  component: "Component",
  subprogramme: "Subprogramme",
  allocation: "Allocation",
  section: "Section",
  mission: "Mission",
  class: "Cost class",
  item: "Cost item",
};

function uniqueSources(sources: Array<BudgetNodeSource | undefined>) {
  return sources.filter(
    (source, index): source is BudgetNodeSource =>
      source !== undefined &&
      sources.findIndex(
        (candidate) =>
          candidate?.url === source.url &&
          candidate.pdfPage === source.pdfPage &&
          candidate.rowLabel === source.rowLabel &&
          candidate.columnHeader === source.columnHeader,
      ) === index,
  );
}

function sourceKey(source: BudgetNodeSource) {
  return [
    source.url,
    source.pdfPage ?? "",
    source.rowLabel,
    source.columnHeader,
  ].join("|");
}

function amountSources(node: BudgetNode): BudgetNodeSource[] {
  if (
    node.allSourcesAmount !== undefined &&
    node.amount === node.allSourcesAmount &&
    node.sources?.total_all_sources
  ) {
    return [node.sources.total_all_sources];
  }
  const fundingSources = Object.keys(node.values ?? {}).map(
    (funding) => node.sources?.[funding as BudgetFundingSource],
  );
  const sources = uniqueSources(fundingSources);
  return sources.length > 0 ? sources : node.source ? [node.source] : [];
}

function BudgetAmount({
  amount,
  sources,
  className,
}: {
  amount: number;
  sources: BudgetNodeSource[];
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <span>{formatBudget(amount)}</span>
      {uniqueSources(sources).map((source) => {
        const location = source.pdfPage
          ? `${source.symbol}, PDF page ${source.pdfPage}`
          : `${source.symbol} PDF`;
        return (
          <a
            key={sourceKey(source)}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open source for ${formatBudget(amount)}: ${location}`}
            title={`Open ${location}`}
            className="inline-flex shrink-0 text-un-blue hover:text-blue-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        );
      })}
    </span>
  );
}

const FUNDING_TREEMAP_COLORS: Record<BudgetFundingSource, string> = {
  regular_budget: "#009edb",
  other_assessed: "#4db8e8",
  extrabudgetary: "#99d6f2",
};

function positiveFundingValues(
  node?: BudgetNode,
): [BudgetFundingSource, number][] {
  if (!node) return [];
  return BUDGET_FUNDING_SOURCES.map(
    (source) =>
      [source, node.values?.[source] ?? 0] as [BudgetFundingSource, number],
  ).filter(([, amount]) => amount > 0);
}

function FundingBreakdownRows({
  node,
  fundingLabels,
  shadeColor,
  useCanonicalColors = false,
}: {
  node?: BudgetNode;
  fundingLabels?: BudgetMeta["fundingLabels"];
  shadeColor: string;
  useCanonicalColors?: boolean;
}) {
  const values = positiveFundingValues(node);
  const total = values.reduce((sum, [, amount]) => sum + amount, 0);
  if (total <= 0) return null;

  return (
    <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
      {values.map(([source, amount]) => (
        <div key={source} className="flex items-center gap-2 text-xs">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-sm ${
              useCanonicalColors
                ? source === "extrabudgetary"
                  ? "bg-open-funding-voluntary-earmarked"
                  : "bg-open-funding-assessed"
                : ""
            }`}
            style={
              useCanonicalColors
                ? undefined
                : {
                    backgroundColor: shadeColor,
                    opacity: FUNDING_SHADE_OPACITY[source],
                  }
            }
          />
          <span className="min-w-0 flex-1 text-slate-600">
            {fundingLabels?.[source] ??
              FUNDING_SOURCES[source]?.label ??
              source}
          </span>
          <span className="whitespace-nowrap text-slate-800">
            {formatBudget(amount)} · {((amount / total) * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function HierarchyRowDetails({
  node,
  fundingLabels,
}: {
  node: BudgetNode;
  fundingLabels?: BudgetMeta["fundingLabels"];
}) {
  const sources = amountSources(node);

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium text-slate-900">
          {node.entity?.name ?? node.label}
        </p>
        <p className="mt-0.5 text-slate-600">{formatBudget(node.amount)}</p>
        <FundingBreakdownRows
          node={node}
          fundingLabels={fundingLabels}
          shadeColor="transparent"
          useCanonicalColors
        />
      </div>

      {sources.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <p className="mb-1 font-medium text-slate-900">Source</p>
          <div className="space-y-2">
            {sources.map((source) => {
              const location = source.pdfPage
                ? `${source.symbol}, PDF page ${source.pdfPage}`
                : `${source.symbol} PDF`;
              return (
                <div key={sourceKey(source)}>
                  {source.tableTitle && (
                    <p className="text-slate-600">
                      Table “{source.tableTitle}”
                    </p>
                  )}
                  <p className="text-slate-600">
                    Row “{source.rowLabel}”, column “{source.columnHeader}”
                  </p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-8 items-center text-un-blue underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
                  >
                    Open {location}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface MiniBudgetLeafData {
  node?: BudgetNode;
  parentAmount: number;
  isGap?: boolean;
}

type MiniBudgetRow = GroupedTreemapRow<
  BudgetNode,
  BudgetNode,
  MiniBudgetLeafData,
  BudgetFundingSource
>;

function miniLeafLabel(node: BudgetNode): string {
  return node.entity?.name ?? node.label;
}

function miniFundingSegments(
  node: BudgetNode,
  color: string,
): GroupedTreemapSegment<BudgetFundingSource>[] {
  return positiveFundingValues(node).map(([source, value]) => ({
    key: source,
    label: FUNDING_SOURCES[source]?.label ?? source,
    value,
    color: `color-mix(in srgb, ${color} ${FUNDING_SHADE_OPACITY[source] * 100}%, white)`,
    data: source,
  }));
}

function miniNodeLeaf(
  node: BudgetNode,
  color: string,
  parentAmount: number,
): GroupedTreemapLeaf<MiniBudgetLeafData, BudgetFundingSource> {
  return {
    key: node.id,
    label: miniLeafLabel(node),
    value: node.amount,
    color,
    data: { node, parentAmount },
    segments: miniFundingSegments(node, color),
  };
}

function miniGapLeaf(
  key: string,
  label: string,
  amount: number,
  parentAmount: number,
): GroupedTreemapLeaf<MiniBudgetLeafData, BudgetFundingSource> {
  return {
    key,
    label,
    value: amount,
    color: "#d1d5db",
    textColor: "#1f2937",
    data: { parentAmount, isGap: true },
  };
}

function miniChildSubgroup(
  child: BudgetNode,
  index: number,
  childrenByParent: Record<string, BudgetNode[]>,
  stream: BudgetMeta["stream"],
): GroupedTreemapSubgroup<
  BudgetNode,
  MiniBudgetLeafData,
  BudgetFundingSource
> {
  const color = BAND_PALETTE[index % BAND_PALETTE.length].bg;
  const descendants =
    stream === "ppb" ? (childrenByParent[child.id] ?? []) : [];
  const positive = descendants.filter((descendant) => descendant.amount > 0);
  const leaves =
    positive.length > 0
      ? positive.map((descendant) =>
          miniNodeLeaf(descendant, color, child.amount),
        )
      : [miniNodeLeaf(child, color, child.amount)];
  const difference =
    child.amount -
    positive.reduce((sum, descendant) => sum + descendant.amount, 0);
  if (
    positive.length > 0 &&
    !descendants.some((descendant) => descendant.amount < 0) &&
    difference > 5000
  ) {
    leaves.push(
      miniGapLeaf(
        `${child.id}-not-itemized`,
        "Not itemized below this level",
        difference,
        child.amount,
      ),
    );
  }
  return {
    key: child.id,
    label: miniLeafLabel(child),
    data: child,
    labelVisibility: "tooltip-only",
    leaves,
  };
}

function miniFundingRows(
  node: BudgetNode,
  meta: BudgetMeta,
): MiniBudgetRow[] {
  const leaves = positiveFundingValues(node).map(([source, value]) => ({
    key: source,
    label:
      meta.fundingLabels?.[source] ??
      FUNDING_SOURCES[source]?.label ??
      source,
    value,
    color: FUNDING_TREEMAP_COLORS[source],
    textColor: source === "regular_budget" ? undefined : "#1f2937",
    data: { parentAmount: node.amount },
  }));
  return leaves.length > 0
    ? [{ key: node.id, label: miniLeafLabel(node), data: node, leaves }]
    : [];
}

function miniHierarchyRows(
  node: BudgetNode,
  childNodes: BudgetNode[],
  childrenByParent: Record<string, BudgetNode[]>,
  meta: BudgetMeta,
): MiniBudgetRow[] {
  const positive = childNodes.filter((child) => child.amount > 0);
  if (positive.length === 0) return miniFundingRows(node, meta);
  const subgroups = positive.map((child, index) =>
    miniChildSubgroup(child, index, childrenByParent, meta.stream),
  );
  const difference =
    node.amount - positive.reduce((sum, child) => sum + child.amount, 0);
  if (
    !childNodes.some((child) => child.amount < 0) &&
    difference > 5000
  ) {
    subgroups.push({
      key: `${node.id}-not-itemized`,
      label: "Not itemized",
      labelVisibility: "tooltip-only",
      leaves: [
        miniGapLeaf(
          `${node.id}-not-itemized-leaf`,
          "Not itemized in the published breakdown",
          difference,
          node.amount,
        ),
      ],
    });
  }
  return [{
    key: node.id,
    label: miniLeafLabel(node),
    data: node,
    subgroups,
  }];
}

function miniTreemapCaption(
  node: BudgetNode,
  childNodes: BudgetNode[],
  rows: MiniBudgetRow[],
): string {
  if (!childNodes.some((child) => child.amount > 0)) {
    return "Area shows the funding-source composition of this amount.";
  }
  const positiveTotal = childNodes
    .filter((child) => child.amount > 0)
    .reduce((sum, child) => sum + child.amount, 0);
  let caption = childNodes.some((child) => child.amount < 0)
    ? "Area compares the positive published lines; negative adjustments remain listed below."
    : node.amount - positiveTotal > 5000
      ? "Area shows the published lines; grey is the part not itemized below this level."
      : node.amount - positiveTotal < -5000
        ? "Area compares the published lines with one another; together they exceed the published parent total."
        : "Area shows each published line's share of this amount.";
  const leaves = rows.flatMap((row) =>
    (row.subgroups ?? []).flatMap((subgroup) => subgroup.leaves),
  );
  if (
    leaves.some(
      (leaf) => leaf.data?.node && leaf.data.node.parentId !== node.id,
    )
  ) {
    caption +=
      " Subdivisions show the next published level; hover or focus them for details.";
  }
  if (leaves.some((leaf) => (leaf.segments?.length ?? 0) > 1)) {
    caption += " Shades show funding sources in the order listed above.";
  }
  return caption;
}

function MiniBudgetTooltip({
  context,
  fundingLabels,
}: {
  context: GroupedTreemapTooltipContext<
    BudgetNode,
    BudgetNode,
    MiniBudgetLeafData,
    BudgetFundingSource
  >;
  fundingLabels?: BudgetMeta["fundingLabels"];
}) {
  const { leaf } = context;
  const node = leaf.data?.node;
  const kind = node ? KIND_NAMES[node.kind] : null;
  const parentAmount = leaf.data?.parentAmount ?? 0;
  const share = parentAmount > 0 ? (leaf.value / parentAmount) * 100 : 0;
  const segments = positiveFundingValues(node);
  return (
    <div className="space-y-1">
      {kind && (
        <p className="text-[10px] tracking-wide text-slate-400 uppercase">
          {kind}
        </p>
      )}
      <p className="font-medium">{leaf.label}</p>
      <p className="opacity-80">
        {formatBudget(leaf.value)}
        {parentAmount > 0 ? ` · ${share.toFixed(1)}%` : ""}
      </p>
      {segments.map(([source, amount]) => (
        <p key={source} className="flex justify-between gap-4 text-xs">
          <span>
            {fundingLabels?.[source] ??
              FUNDING_SOURCES[source]?.label ??
              source}
          </span>
          <span className="tabular-nums">{formatBudget(amount)}</span>
        </p>
      ))}
    </div>
  );
}

function MiniBudgetTreemap({
  node,
  childNodes,
  childrenByParent,
  meta,
}: {
  node: BudgetNode;
  childNodes: BudgetNode[];
  childrenByParent: Record<string, BudgetNode[]>;
  meta: BudgetMeta;
}) {
  const rows = miniHierarchyRows(node, childNodes, childrenByParent, meta);
  if (rows.length === 0) return null;
  const caption = miniTreemapCaption(node, childNodes, rows);
  return (
    <div>
      <GroupedTreemap<
        BudgetNode,
        BudgetNode,
        MiniBudgetLeafData,
        BudgetFundingSource
      >
        rows={rows}
        totalLabel="Total"
        height={176}
        showLeafValues
        formatValue={formatBudget}
        formatAccessibleValue={formatBudget}
        layout={{ rowOrder: "input", subgroupOrder: "input" }}
        renderTooltip={(context) => (
          <MiniBudgetTooltip
            context={context}
            fundingLabels={meta.fundingLabels}
          />
        )}
      />
      <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{caption}</p>
    </div>
  );
}

function maximumHierarchyAmount(
  nodes: BudgetNode[],
  childrenByParent: Record<string, BudgetNode[]>,
): number {
  return nodes.reduce(
    (maximum, child) =>
      Math.max(
        maximum,
        child.amount,
        maximumHierarchyAmount(
          childrenByParent[child.id] ?? [],
          childrenByParent,
        ),
      ),
    0,
  );
}

function BudgetHierarchy({
  nodes,
  childrenByParent,
  depth = 0,
  scaleMaximum,
  parentAmount,
}: {
  nodes: BudgetNode[];
  childrenByParent: Record<string, BudgetNode[]>;
  depth?: number;
  scaleMaximum?: number;
  parentAmount?: number;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  // One quantitative scale for the entire expanded subtree, so bar lengths
  // remain directly comparable across hierarchy levels.
  const commonMaximum =
    scaleMaximum ?? maximumHierarchyAmount(nodes, childrenByParent);
  const scaledWidth = (amount: number) =>
    commonMaximum > 0
      ? Math.min(100, Math.max(0, (amount / commonMaximum) * 100))
      : 0;

  return (
    <ul className={depth === 0 ? "space-y-2" : "mt-2 space-y-2"}>
      {nodes.map((child) => {
        const descendants = childrenByParent[child.id] ?? [];
        const fundingValues = positiveFundingValues(child);
        const barColor = depth === 0 ? "#009edb" : "#4a7c7e";
        const hasDescendants = descendants.length > 0;
        const isExpanded = expandedIds.has(child.id);
        const toggleExpanded = () => {
          if (!hasDescendants) return;
          setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(child.id)) next.delete(child.id);
            else next.add(child.id);
            return next;
          });
        };
        const label = (
          <span className="min-w-0 leading-tight text-gray-700">
            {child.kind === "subprogramme" && (
              <span className="mb-0.5 block text-[10px] tracking-wide text-gray-400 uppercase">
                {KIND_NAMES.subprogramme}
              </span>
            )}
            <span className="block">{child.entity?.name ?? child.label}</span>
          </span>
        );
        const bar = (
          <div
            aria-hidden="true"
            className="relative h-1.5 w-full overflow-hidden rounded-sm"
          >
            {depth > 0 && parentAmount !== undefined && (
              <div
                className="absolute inset-y-0 left-0 rounded-sm bg-gray-200"
                style={{ width: `${scaledWidth(parentAmount)}%` }}
              />
            )}
            {fundingValues.length > 0 ? (
              <>
                {fundingValues.map(([source, amount], index) => {
                  const precedingAmount = fundingValues
                    .slice(0, index)
                    .reduce((sum, [, value]) => sum + value, 0);
                  return (
                    <div
                      key={source}
                      className="absolute inset-y-0"
                      style={{
                        left: `${scaledWidth(precedingAmount)}%`,
                        width: `${scaledWidth(amount)}%`,
                        backgroundColor: barColor,
                        opacity: FUNDING_SHADE_OPACITY[source],
                      }}
                    />
                  );
                })}
                {fundingValues.slice(1).map(([source], index) => {
                  const precedingAmount = fundingValues
                    .slice(0, index + 1)
                    .reduce((sum, [, value]) => sum + value, 0);
                  return (
                    <div
                      key={`separator-${source}`}
                      className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-white"
                      style={{
                        left: `${scaledWidth(precedingAmount)}%`,
                      }}
                    />
                  );
                })}
              </>
            ) : (
              <div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{
                  width: `${scaledWidth(child.amount)}%`,
                  backgroundColor: barColor,
                }}
              />
            )}
          </div>
        );
        return (
          <li key={child.id}>
            <div
              className="flex min-w-0 items-stretch gap-1"
              style={{ paddingInlineStart: `${depth * 0.75}rem` }}
            >
              {hasDescendants ? (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${child.entity?.name ?? child.label}`}
                  onClick={toggleExpanded}
                  className="flex size-11 shrink-0 cursor-pointer items-start justify-center rounded-sm pt-3 text-gray-400 hover:bg-slate-100 hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
                >
                  <ChevronRight
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
              ) : (
                <span className="w-11 shrink-0" aria-hidden="true" />
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Show financial details for ${child.entity?.name ?? child.label}`}
                    className="grid min-h-11 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_4rem_5.5rem] items-center gap-x-2 rounded-sm px-1 py-1 text-left text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue sm:grid-cols-[minmax(0,1fr)_5rem_6rem] sm:gap-x-3"
                  >
                    {label}
                    {bar}
                    <span className="justify-self-end whitespace-nowrap text-gray-900">
                      {formatBudget(child.amount)}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  sideOffset={8}
                  collisionPadding={12}
                  onEscapeKeyDown={(event) => event.stopPropagation()}
                  className="max-h-[min(24rem,var(--radix-popover-content-available-height))] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto border-slate-200 bg-white text-xs text-slate-800 shadow-lg"
                >
                  <HierarchyRowDetails node={child} />
                </PopoverContent>
              </Popover>
            </div>
            {hasDescendants && isExpanded && (
              <BudgetHierarchy
                nodes={descendants}
                childrenByParent={childrenByParent}
                depth={depth + 1}
                scaleMaximum={commonMaximum}
                parentAmount={child.amount}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function BudgetSidebar({
  node,
  parent,
  childrenByParent,
  meta,
  hashPrefix,
  dataset,
  years,
  onClose,
}: BudgetSidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const focusTrapRef = useFocusTrap(true);
  const metricLabel =
    meta.metrics?.[meta.measure as BudgetMetricKey]?.label ?? "Expenditure";

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
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

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const childNodes = childrenByParent[node.id] ?? [];
  const fundingEntries = positiveFundingValues(node);
  const childSum = childNodes.reduce((sum, child) => sum + child.amount, 0);
  const childGap = node.amount - childSum;
  const labelledSourceReferences = fundingEntries.flatMap(([source]) => {
    const reference = node.sources?.[source];
    return reference
      ? [
          {
            fundingSource: source,
            reference,
          },
        ]
      : [];
  });
  const sourceReferences =
    labelledSourceReferences.length > 0
      ? labelledSourceReferences
      : amountSources(node).map((reference) => ({
          fundingSource: null,
          reference,
        }));
  const titleId = "budget-sidebar-title";

  // What the row is, and where it sits. The rows below a budget unit keep the
  // name of their kind, because "component" and "subprogramme" are not the same
  // thing and the reader should not have to guess which one a row is.
  const subtitle = () => {
    if (node.tier === "section") return `Budget section ${node.code}`;
    if (node.tier === "part") return `Budget part ${node.code}`;
    if (node.tier === "mission")
      return meta.missionNames?.[node.code ?? ""] ?? "Peacekeeping mission";
    if (node.tier === "class")
      return meta.missionNames?.[node.mission ?? ""] ?? node.mission ?? "";
    if (node.tier === "item") return parent?.label ?? "";
    // One budget unit of a section — the level the treemap draws as tiles.
    if (node.tier === "budget_unit" && meta.stream === "trust_funds")
      return "Secretariat entity";
    if (node.entity?.relationship === "entity_aggregate")
      return parent?.tier === "part"
        ? `Entity in budget part ${parent.code}`
        : "Entity";
    if (node.tier === "budget_unit")
      return parent ? `Budget unit of ${parent.label}` : "Budget unit";
    const kindName = KIND_NAMES[node.kind];
    if (kindName) return parent ? `${kindName} of ${parent.label}` : kindName;
    return meta.scopeLabel;
  };

  // A section view stays a section view. Other tiles may use the canonical
  // organization name where the entity dimension supports one.
  const heading =
    node.tier === "section" ? node.label : (node.entity?.name ?? node.label);
  const breakdownHeading =
    node.entity?.relationship === "entity_aggregate"
      ? "Entity breakdown"
      : node.tier === "section"
        ? "Section breakdown"
        : "Budget breakdown";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "opacity-100" : "opacity-0"}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${isVisible && !isClosing ? "translate-x-0" : "translate-x-full"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-300 bg-white px-6 pt-4 pb-2 sm:px-8 sm:pt-6 sm:pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2
                id={titleId}
                className="text-xl leading-tight font-bold text-gray-900 sm:text-2xl"
              >
                {node.tier === "mission" ? (node.code ?? node.label) : heading}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {node.entity?.acronym ? `${node.entity.acronym} · ` : ""}
                {subtitle()} · {meta.fiscalYear}
              </p>
            </div>
            <SidebarControls
              shareHash={`${hashPrefix}=${encodeURIComponent(node.id)}`}
              onClose={handleClose}
              closeLabel="Close sidebar"
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 pt-4 pb-6 sm:px-8 sm:pt-5 sm:pb-8">
          {/* The sidebar always shows the full published funding-source view,
              independently of the filters applied to the main treemap. */}
          {fundingEntries.length > 0 && (
            <div>
              <h3 className="mb-2 text-lg font-normal tracking-wider text-gray-900 uppercase">
                {metricLabel} {meta.fiscalYear} by funding source
              </h3>
              <div className="space-y-2">
                {fundingEntries.map(([key, amount]) => {
                  const style = FUNDING_SOURCES[key];
                  const label =
                    meta.fundingLabels?.[key] ?? style?.label ?? key;
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          backgroundColor: FUNDING_TREEMAP_COLORS[key],
                        }}
                        title={style?.tooltip}
                      />
                      <span className="flex-1 text-gray-700">{label}</span>
                      <BudgetAmount
                        amount={amount}
                        sources={
                          node.sources?.[key as BudgetFundingSource]
                            ? [
                                node.sources[
                                  key as BudgetFundingSource
                                ] as BudgetNodeSource,
                              ]
                            : []
                        }
                        className="text-gray-900"
                      />
                    </div>
                  );
                })}
              </div>
              {node.completeness && node.completeness !== "complete" && (
                <p className="mt-2 text-xs text-gray-500">
                  Not every funding source is published for this line
                  {node.completeness === "not_published"
                    ? ""
                    : " (partly published)"}
                  .
                </p>
              )}
            </div>
          )}

          {meta.stream === "ppb" &&
            dataset?.startsWith("budget-ppb-") &&
            years &&
            years.length > 0 && (
              <ProgrammeBudgetNodeTrend
                node={node}
                dataset={dataset}
                years={years}
              />
            )}

          {/* Hierarchy or, for an undivided leaf, funding-source composition */}
          {(childNodes.length > 0 || fundingEntries.length > 1) && (
            <div>
              <h3 className="mb-3 text-lg font-normal tracking-wider text-gray-900 uppercase">
                {breakdownHeading}
              </h3>
              <MiniBudgetTreemap
                node={node}
                childNodes={childNodes}
                childrenByParent={childrenByParent}
                meta={meta}
              />
              {childNodes.length > 0 && (
                <>
                  <div className="mt-4">
                    <BudgetHierarchy
                      nodes={childNodes}
                      childrenByParent={childrenByParent}
                    />
                  </div>
                  {Math.abs(childGap) > 5000 && (
                    <p className="mt-3 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                      The published parent total is {formatBudget(node.amount)},
                      but the published lines below add to{" "}
                      {formatBudget(childSum)}— a difference of{" "}
                      {formatBudget(Math.abs(childGap))}. The parent total
                      remains authoritative; this breakdown is flagged and is
                      not used to size the main treemap.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Keep only references that take the reader to a concrete source. */}
          {(sourceReferences.length > 0 || meta.documentUrl) && (
            <div>
              <h3 className="mb-2 text-lg font-normal tracking-wider text-gray-900 uppercase">
                Source references
              </h3>
              <div className="space-y-3">
                {sourceReferences.map(({ fundingSource, reference }) => (
                  <div
                    key={`${fundingSource ?? "all"}|${sourceKey(reference)}`}
                  >
                    {fundingSource && (
                      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                        {meta.fundingLabels?.[fundingSource] ??
                          FUNDING_SOURCES[fundingSource]?.label ??
                          fundingSource}
                      </p>
                    )}
                    {reference.tableTitle && (
                      <p className="mt-0.5 text-sm text-gray-700">
                        Table “{reference.tableTitle}”
                      </p>
                    )}
                    <p className="mt-0.5 text-sm text-gray-700">
                      Row “{reference.rowLabel}”, column “
                      {reference.columnHeader}”
                    </p>
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
                    >
                      {reference.symbol}
                      {reference.pdfPage
                        ? `, PDF page ${reference.pdfPage}`
                        : " PDF"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
                {sourceReferences.length === 0 && meta.documentUrl && (
                  <a
                    href={meta.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
                  >
                    {meta.documentSymbol ?? "Source document"} PDF
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
