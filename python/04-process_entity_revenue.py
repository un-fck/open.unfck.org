"""Generate entity-revenue-{year}.json with revenue breakdown by type and donor."""

import json
import pandas as pd
from utils import clean_donor_name, load_donor_revenue, load_non_gov_donor_revenue

YEARS = range(2013, 2025)  # 2013-2024


def process_year(year: int) -> None:
    """Process and output entity revenue for a single year."""
    df_gov = load_donor_revenue(year=year)
    df_non_gov = load_non_gov_donor_revenue(year=year)
    
    # Normalize column names for merging
    df_gov = df_gov.rename(columns={"government_donor": "donor"})
    df_non_gov = df_non_gov.rename(columns={"donor_name": "donor"})
    df = pd.concat([df_gov[["entity", "donor", "rev_type", "amount"]], 
                    df_non_gov[["entity", "donor", "rev_type", "amount"]]])
    
    entity_revenue = {}
    for entity in df["entity"].unique():
        edf = df[df["entity"] == entity]
        by_type = edf.groupby("rev_type")["amount"].sum().to_dict()
        
        donor_data = {}
        for donor, gdf in edf.groupby("donor"):
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


for year in YEARS:
    process_year(year)
