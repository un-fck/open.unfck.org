"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { HybridMap } from "@undp/data-viz";
import { CountrySidebar } from "@/components/CountrySidebar";
import { CountryTreemap } from "@/components/CountryTreemap";
import { YearSlider } from "@/components/YearSlider";
import { useDeepLink } from "@/hooks/useDeepLink";
import { Switch } from "@/components/ui/switch";
import { formatBudget } from "@/lib/entities";
import { generateYearRange, YEAR_RANGES } from "@/lib/data";

interface CountryExpense {
  iso3: string;
  name: string;
  region: string;
  lat: number;
  long: number;
  total: number;
  entities: Record<string, number>;
}

interface HybridMapDataPoint {
  id: string;
  lat: number;
  long: number;
  radius: number;
  label: string;
  data: {
    iso3: string;
    name: string;
    total: number;
    entities: Record<string, number>;
  };
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const COUNTRY_YEARS = generateYearRange(YEAR_RANGES.countryExpenses.min, YEAR_RANGES.countryExpenses.max);

export function CountryMap() {
  const [countryData, setCountryData] = useState<CountryExpense[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<{
    iso3: string;
    name: string;
    total: number;
    entities: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(YEAR_RANGES.countryExpenses.default);
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "country",
    sectionId: "countries",
  });

  // Open sidebar when data is loaded and there's a pending deep link
  useEffect(() => {
    if (!loading && pendingDeepLink && countryData.length > 0) {
      const country = countryData.find(c => c.iso3 === pendingDeepLink);
      if (country) {
        setSelectedCountry({
          iso3: country.iso3,
          name: country.name,
          total: country.total,
          entities: country.entities,
        });
      }
      setPendingDeepLink(null);
    }
  }, [loading, pendingDeepLink, countryData]);

  useEffect(() => {
    setLoading(true);
    fetch(`${basePath}/data/country-expenses-${selectedYear}.json`)
      .then((res) => res.json())
      .then((data: CountryExpense[]) => {
        setCountryData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load country data:", err);
        setLoading(false);
      });
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (!countryData || countryData.length === 0) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-500">Failed to load country data</p>
      </div>
    );
  }

  // Filter countries by search query (matches country name or region)
  const filteredData = searchQuery.trim()
    ? countryData.filter((country) => {
        const term = searchQuery.toLowerCase();
        return (
          country.name.toLowerCase().includes(term) ||
          country.region.toLowerCase().includes(term) ||
          country.iso3.toLowerCase().includes(term)
        );
      })
    : countryData;

  const handleReset = () => {
    setSearchQuery("");
  };

  const isResetNeeded = searchQuery.trim() !== "";

  // Calculate radius scale based on spending (linear - area proportional to value)
  const maxSpending = Math.max(...countryData.map((d) => d.total));
  const maxRadius = 30;

  // Transform data for HybridMap - includes both id (for country clicks) and lat/long (for dots)
  const mapData: HybridMapDataPoint[] = filteredData.map((country) => ({
    id: country.iso3,
    lat: country.lat,
    long: country.long,
    radius: (country.total / maxSpending) * maxRadius,
    label: country.name,
    data: {
      iso3: country.iso3,
      name: country.name,
      total: country.total,
      entities: country.entities,
    },
  }));

  const handleClick = (d: HybridMapDataPoint) => {
    if (d && d.data) {
      setSelectedCountry({
        iso3: d.data.iso3,
        name: d.data.name,
        total: d.data.total,
        entities: d.data.entities,
      });
    }
  };

  const handleTreemapClick = (country: CountryExpense) => {
    setSelectedCountry({
      iso3: country.iso3,
      name: country.name,
      total: country.total,
      entities: country.entities,
    });
  };

  return (
    <div className="w-full">
      {/* Filter Controls */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                <svg
                  className="h-3.5 w-3.5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by country or region..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block h-9 w-full rounded-none border-0 border-b border-gray-300 bg-transparent py-1.5 pl-8 pr-3 text-sm placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0"
              />
            </div>

            {/* Reset Button */}
            {isResetNeeded && (
              <button
                onClick={handleReset}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all duration-200 ease-out hover:bg-gray-400 hover:text-gray-100 focus:bg-gray-400 focus:text-gray-100 focus:outline-none"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Year Slider */}
            <YearSlider
              years={COUNTRY_YEARS}
              selectedYear={selectedYear}
              onChange={setSelectedYear}
            />

            {/* View Toggle */}
            <div className="flex h-9 items-center gap-2">
              <span
                className={`text-sm ${!showMap ? "font-medium text-gray-900" : "text-gray-500"}`}
              >
                Budget chart
              </span>
              <Switch
                checked={showMap}
                onCheckedChange={setShowMap}
                aria-label="Toggle between budget chart and map"
              />
              <span
                className={`text-sm ${showMap ? "font-medium text-gray-900" : "text-gray-500"}`}
              >
                Map
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Map or Treemap View */}
      {filteredData.length === 0 ? (
        <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-500">
            No countries match the search criteria
          </p>
        </div>
      ) : showMap ? (
        <div className="h-[650px] w-full">
          <HybridMap
            data={mapData}
            mapProjection="equalEarth"
            scale={1.15}
            centerPoint={[0, 6]}
            colors={["#f3f4f6"]}
            dotColor="#009edb"
            dotBorderColor="#009edb"
            zoomInteraction="button"
            mapBorderWidth={0.5}
            mapBorderColor="#e5e7eb"
            mapNoDataColor="#f3f4f6"
            height={650}
            padding={"0px"}
            showAntarctica={false}
            isWorldMap={true}
            footNote=""
            showColorScale={false}
            tooltip={(d: HybridMapDataPoint) => (
              <div style={{ textAlign: "center", padding: "4px" }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b", margin: 0 }}>
                  {d.data.name}
                </p>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#475569", margin: "4px 0 0 0" }}>
                  {formatBudget(d.data.total)}
                </p>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
                  Click for details
                </p>
              </div>
            )}
            onSeriesMouseClick={handleClick}
            styles={{
              tooltip: {
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "8px 12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
                maxWidth: "200px",
              },
            }}
          />
        </div>
      ) : (
        <CountryTreemap data={filteredData} onCountryClick={handleTreemapClick} />
      )}

      {selectedCountry && (
        <CountrySidebar
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  );
}
