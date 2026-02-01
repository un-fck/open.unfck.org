"""Generate entity-revenue-{year}.json with revenue breakdown by type and donor."""

import json
from utils import clean_donor_name, load_donor_revenue

# Year range for entity revenue
YEARS = range(2013, 2025)  # 2013-2024


def process_year(year: int) -> None:
    """Process and output entity revenue for a single year."""
    df = load_donor_revenue(year=year)
    entity_revenue = {}

    for entity in df["entity"].unique():
        edf = df[df["entity"] == entity]
        by_type = edf.groupby("rev_type")["amount"].sum().to_dict()
        
        # Group by cleaned donor name (merges e.g. "Kosovo**" with "Kosovo")
        donor_data = {}
        for donor, gdf in edf.groupby("government_donor"):
            clean_name = clean_donor_name(donor)
            if clean_name not in donor_data:
                donor_data[clean_name] = {"donor": clean_name, "total": 0}
            donor_data[clean_name]["total"] += gdf["amount"].sum()
            for rev_type, amount in gdf.groupby("rev_type")["amount"].sum().items():
                donor_data[clean_name][rev_type] = donor_data[clean_name].get(rev_type, 0) + amount
        
        by_donor = sorted(donor_data.values(), key=lambda x: -x["total"])
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
