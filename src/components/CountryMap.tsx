"use client";

import { useEffect, useState } from "react";
import { HybridMap } from "@undp/data-viz";
import { CountrySidebar } from "@/components/CountrySidebar";
import { formatBudget } from "@/lib/entities";

interface CountryExpense {
  iso3: string;
  name: string;
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
  const [countryData, setCountryData] = useState<CountryExpense[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<{
    iso3: string;
    name: string;
    total: number;
    entities: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${basePath}/data/country-expenses.json`)
      .then((res) => res.json())
      .then((data: CountryExpense[]) => {
        setCountryData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load country data:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (!countryData || countryData.length === 0) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-500">Failed to load country data</p>
      </div>
    );
  }

  // Calculate radius scale based on spending (linear - area proportional to value)
  const maxSpending = Math.max(...countryData.map((d) => d.total));
  const maxRadius = 30;

  // Transform data for HybridMap - includes both id (for country clicks) and lat/long (for dots)
  const mapData: HybridMapDataPoint[] = countryData.map((country) => ({
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

  return (
    <div className="w-full">
      <div className="h-[450px] w-full">
        <HybridMap
          data={mapData}
          mapProjection="equalEarth"
          scale={1.15}
          centerPoint={[0, 6]}
          colors={["#f3f4f6"]}
          dotColor="#0969da"
          zoomInteraction="button"
          mapBorderWidth={0.5}
          mapBorderColor="#e5e7eb"
          mapNoDataColor="#f3f4f6"
          height={450}
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

      {selectedCountry && (
        <CountrySidebar
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  );
}
