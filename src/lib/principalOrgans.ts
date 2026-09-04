import type { Entity } from "@/types";

const principalOrganBadgeColors: Record<string, string> = {
  "General Assembly": "bg-syschart-green",
  "Security Council": "bg-syschart-red",
  "Economic and Social Council": "bg-syschart-blue",
  Secretariat: "bg-syschart-yellow",
  "International Court of Justice": "bg-syschart-purple",
  "Trusteeship Council": "bg-syschart-brown",
  "Related Organizations": "bg-syschart-gray",
  "Specialized Agencies": "bg-syschart-gray",
};

export function normalizePrincipalOrgans(
  value: Entity["un_principal_organ"] | null | undefined,
): string[] {
  const values = Array.isArray(value) ? value : [value];

  return values.reduce<string[]>((organs, organ) => {
    const normalized = organ?.trim();
    if (normalized && !organs.includes(normalized)) organs.push(normalized);
    return organs;
  }, []);
}

export function getPrincipalOrganBadgeColor(principalOrgan: string): string {
  return principalOrganBadgeColors[principalOrgan] ?? "bg-gray-200";
}
