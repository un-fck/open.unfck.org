// SDG Types
export interface Indicator {
  number: string;
  description: string;
  code: string;
}

export interface Target {
  number: string;
  description: string;
  indicators: Indicator[];
}

export interface SDG {
  number: number;
  shortTitle: string;
  title: string;
  targets: Target[];
}

export interface SDGExpensesData {
  [sdg: string]: {
    total: number;
    entities: { [entity: string]: number };
  };
}

// SDG Colors (official UN SDG colors)
export const SDG_COLORS: Record<number, string> = {
  1: "#E5243B",
  2: "#DDA63A",
  3: "#4C9F38",
  4: "#C5192D",
  5: "#FF3A21",
  6: "#26BDE2",
  7: "#FCC30B",
  8: "#A21942",
  9: "#FD6925",
  10: "#DD1367",
  11: "#FD9D24",
  12: "#BF8B2E",
  13: "#3F7E44",
  14: "#0A97D9",
  15: "#56C02B",
  16: "#00689D",
  17: "#19486A",
};

// SDG Short Titles
export const SDG_SHORT_TITLES: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health and Well-being",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water and Sanitation",
  7: "Affordable and Clean Energy",
  8: "Decent Work and Economic Growth",
  9: "Industry, Innovation, and Infrastructure",
  10: "Reduced Inequality",
  11: "Sustainable Cities and Communities",
  12: "Responsible Consumption and Production",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace, Justice, and Strong Institutions",
  17: "Partnerships for the Goals",
};

// SDG Full Titles
export const SDG_TITLES: Record<number, string> = {
  1: "End poverty in all its forms everywhere",
  2: "End hunger, achieve food security and improved nutrition and promote sustainable agriculture",
  3: "Ensure healthy lives and promote well-being for all at all ages",
  4: "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all",
  5: "Achieve gender equality and empower all women and girls",
  6: "Ensure availability and sustainable management of water and sanitation for all",
  7: "Ensure access to affordable, reliable, sustainable and modern energy for all",
  8: "Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all",
  9: "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation",
  10: "Reduce inequality within and among countries",
  11: "Make cities and human settlements inclusive, safe, resilient and sustainable",
  12: "Ensure sustainable consumption and production patterns",
  13: "Take urgent action to combat climate change and its impacts",
  14: "Conserve and sustainably use the oceans, seas and marine resources for sustainable development",
  15: "Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss",
  16: "Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels",
  17: "Strengthen the means of implementation and revitalize the Global Partnership for Sustainable Development",
};
