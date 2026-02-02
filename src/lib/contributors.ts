export type ContributorStatus = "member" | "observer" | "nonmember" | "organization";

export interface Contributor {
  name: string;
  status: ContributorStatus;
  contributions: Record<string, Record<string, number>>;
  payment_status?: "punctual" | "late" | "missing";
}

export interface ContributorData {
  status: ContributorStatus;
  contributions: Record<string, Record<string, number>>;
  payment_status?: "punctual" | "late" | "missing";
}

export const getStatusStyle = (status: string) => {
  switch (status) {
    case "member":
      return {
        bgColor: "bg-un-blue-muted",
        textColor: "text-white",
        label: "Member State",
        order: 1,
      };
    case "observer":
      return {
        bgColor: "bg-un-blue-dark",
        textColor: "text-white",
        label: "Observer State",
        order: 2,
      };
    case "nonmember":
      return {
        bgColor: "bg-un-blue-slate",
        textColor: "text-white",
        label: "Non-Member State",
        order: 3,
      };
    case "organization":
      return {
        bgColor: "bg-faded-jade",
        textColor: "text-white",
        label: "Non-Government",
        order: 4,
      };
    default:
      return {
        bgColor: "bg-gray-500",
        textColor: "text-white",
        label: "Unknown",
        order: 999,
      };
  }
};

export const isGovernmentDonor = (status: ContributorStatus): boolean => {
  return status === "member" || status === "observer" || status === "nonmember";
};

export const getTotalContributions = (
  contributions: Record<string, Record<string, number>>
): number => {
  return Object.values(contributions).reduce((total, entityContributions) => {
    return (
      total +
      Object.values(entityContributions).reduce(
        (sum, amount) => sum + amount,
        0
      )
    );
  }, 0);
};

export const formatBudget = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
};

export const getDisplayName = (name: string): string => {
  return name
    .replace(/\([^)]*\)/g, "")
    .replace(/\*/g, "")
    .replace(/Special Administrative Region/gi, "SAR")
    .trim();
};

export const getContributionTypeOrder = (type: string): number => {
  if (type === "Assessed") return 0;
  if (type === "Voluntary un-earmarked") return 1;
  if (type === "Voluntary earmarked") return 2;
  if (type === "Other") return 3;
  return 4;
};

export const getContributionTypeColor = (type: string): string => {
  if (type === "Assessed") return "opacity-100";
  if (type === "Voluntary un-earmarked") return "opacity-80";
  if (type === "Voluntary earmarked") return "opacity-60";
  if (type === "Other") return "opacity-40";
  return "opacity-50";
};

export const CONTRIBUTION_TYPES = [
  { type: "Assessed", label: "Assessed", opacity: "opacity-100" },
  { type: "Voluntary un-earmarked", label: "Voluntary un-earmarked", opacity: "opacity-80" },
  { type: "Voluntary earmarked", label: "Voluntary earmarked", opacity: "opacity-60" },
  { type: "Other", label: "Other", opacity: "opacity-40" },
] as const;
