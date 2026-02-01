"""Generate entity-revenue-{year}.json with revenue breakdown by type and donor."""

import json
from utils import load_donor_revenue

# Year range for entity revenue
YEARS = range(2013, 2025)  # 2013-2024


def process_year(year: int) -> None:
    """Process and output entity revenue for a single year."""
    df = load_donor_revenue(year=year)
    entity_revenue = {}

    for entity in df["entity"].unique():
        edf = df[df["entity"] == entity]
        by_type = edf.groupby("rev_type")["amount"].sum().to_dict()
        by_donor = []
        for donor, gdf in edf.groupby("government_donor"):
            entry = {"donor": donor, "total": gdf["amount"].sum()}
            entry.update(gdf.groupby("rev_type")["amount"].sum().to_dict())
            by_donor.append(entry)
        by_donor.sort(key=lambda x: -x["total"])
        entity_revenue[entity] = {
            "total": edf["amount"].sum(),
            "year": year,
            "by_type": by_type,
            "by_donor": by_donor,
        }

    total = sum(e["total"] for e in entity_revenue.values())
    output_file = f"public/data/entity-revenue-{year}.json"
    with open(output_file, "w") as f:
        json.dump(entity_revenue, f, indent=2)
    print(f"{year}: {len(entity_revenue)} entities, ${total/1e9:.1f}B -> {output_file}")


# Process all years
for year in YEARS:
    process_year(year)
