// Financing instrument definitions and colors based on UN Data Standards

export const FINANCING_INSTRUMENT_COLORS = {
  assessed: "#009edb",           // UN blue - full opacity
  voluntary_unearmarked: "#4db8e8", // UN blue - lighter
  voluntary_earmarked: "#99d6f2",   // UN blue - lightest
  other: "#cceaf7",                 // UN blue - very light
};

// Tailwind class equivalents for the colors above
export const FINANCING_INSTRUMENT_BG_CLASSES: Record<string, string> = {
  "Assessed": "bg-un-blue",
  "Voluntary un-earmarked": "bg-[#4db8e8]",
  "Voluntary earmarked": "bg-[#99d6f2]",
  "Other": "bg-[#cceaf7]",
};

export const FINANCING_INSTRUMENT_TOOLTIPS: Record<string, string> = {
  "Assessed": "Fixed contributions calculated by formula that Member States pay upon signing a treaty",
  "Voluntary un-earmarked": "Voluntary contributions without restrictions on use (core funding)",
  "Voluntary earmarked": "Voluntary contributions tied to specific purposes or programmes (non-core)",
  "Other": "Other revenue",
};

export const FINANCING_INSTRUMENT_ORDER = ["Assessed", "Voluntary un-earmarked", "Voluntary earmarked", "Other"] as const;

export type FinancingInstrumentType = typeof FINANCING_INSTRUMENT_ORDER[number];

export const getFinancingInstrumentColor = (type: string): string => {
  if (type === "Assessed") return FINANCING_INSTRUMENT_COLORS.assessed;
  if (type === "Voluntary un-earmarked") return FINANCING_INSTRUMENT_COLORS.voluntary_unearmarked;
  if (type === "Voluntary earmarked") return FINANCING_INSTRUMENT_COLORS.voluntary_earmarked;
  return FINANCING_INSTRUMENT_COLORS.other;
};

export const getFinancingInstrumentBgClass = (type: string): string => {
  return FINANCING_INSTRUMENT_BG_CLASSES[type] || "bg-[#cceaf7]";
};
