import { Entity, BudgetEntry } from "@/types";

/**
 * Format budget amount as currency
 */
export const formatBudget = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
};

/**
 * Create a URL-safe slug from entity name
 */
export function createEntitySlug(entityName: string): string {
  return entityName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "-")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Find entity by matching original name to slug
 */
export function findEntityBySlug(
  entities: Entity[],
  slug: string
): Entity | null {
  const decodedSlug = decodeURIComponent(slug).toLowerCase();

  return (
    entities.find((entity) => {
      if (!entity.entity) return false;
      const entitySlug = createEntitySlug(entity.entity);
      return entitySlug === decodedSlug;
    }) || null
  );
}

/**
 * Get display name for entity (short code or long name)
 */
export function getEntityDisplayName(entity: Entity): string {
  return entity.entity || entity.entity_long || "Unknown Entity";
}

/**
 * Convert budget array to lookup object by entity code
 */
export function createBudgetLookup(
  budgetData: BudgetEntry[]
): Record<string, number> {
  return budgetData.reduce(
    (acc, entry) => {
      acc[entry.entity] = entry.amount;
      return acc;
    },
    {} as Record<string, number>
  );
}
