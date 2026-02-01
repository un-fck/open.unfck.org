"""Generate entity-revenue.json with revenue breakdown by type and donor."""

import json
from utils import load_donor_revenue

YEAR = 2024

df = load_donor_revenue(year=YEAR)
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
        "year": YEAR,
        "by_type": by_type,
        "by_donor": by_donor,
    }

print(f"Processed {len(entity_revenue)} entities, total: ${sum(e['total'] for e in entity_revenue.values())/1e9:.1f}B")
with open("public/data/entity-revenue.json", "w") as f:
    json.dump(entity_revenue, f, indent=2)
