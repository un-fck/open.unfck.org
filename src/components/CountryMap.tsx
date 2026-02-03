"use client";

import { useEffect, useState } from "react";
import { HybridMap } from "@undp/data-viz";
import { CountrySidebar } from "@/components/CountrySidebar";
import { CountryTreemap } from "@/components/CountryTreemap";
import { YearSlider } from "@/components/YearSlider";
import { useDeepLink } from "@/hooks/useDeepLink";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { Switch } from "@/components/ui/switch";
import { formatBudget } from "@/lib/entities";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import { getSortedRegions } from "@/lib/regionGroupings";

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

export function CountryMap() {
  const yearRanges = useYearRanges();
  const COUNTRY_YEARS = generateYearRange(yearRanges.countryExpenses.min, yearRanges.countryExpenses.max);

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
  const [selectedYear, setSelectedYear] = useState<number>(yearRanges.countryExpenses.default);
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
        <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          {/* Search Input */}
          <ChartSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by country or region..."
          />

          <div className="flex flex-wrap items-center gap-4">
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
        <>
          <CountryTreemap data={filteredData} onCountryClick={handleTreemapClick} />
          
          {/* Region Legend */}
          <div className="mt-3 flex flex-wrap gap-3">
            {getSortedRegions()
              .filter(([region]) => {
                // Only show regions that have data in the current filtered set
                return filteredData.some((c) => c.region === region);
              })
              .map(([region, styles]) => (
                <div key={region} className="flex items-center gap-1.5">
                  <div className={`h-3 w-3 rounded-sm ${styles.bgColor}`} />
                  <span className="text-xs text-gray-600">{styles.label}</span>
                </div>
              ))}
          </div>
        </>
      )}

      {selectedCountry && (
        <CountrySidebar
          country={selectedCountry}
          initialYear={selectedYear}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  );
}
