"""Generate entity-spending-{year}.json with combined CEB and Secretariat data."""

import json
from pathlib import Path

import pandas as pd
from utils import normalize_entity, parse_amount


# Years with full secretariat data for fusion
YEARS = range(2019, 2024)  # 2019-2023

# Load entities for validation
entities = json.loads(Path("public/data/entities.json").read_text())
entity_names = set([e["entity"] for e in entities])

# Load raw data
df_system_all = pd.read_csv("data/un-system-expenses.csv")
df_system_all["amount"] = df_system_all["amount"].apply(parse_amount)
df_system_all["agency"] = df_system_all["agency"].apply(normalize_entity)

df_secretariat_all = pd.read_csv("data/un-secretariat-expenses.csv")
df_secretariat_all["entity"] = df_secretariat_all["ENTITY"].apply(normalize_entity)
df_secretariat_all["amount"] = df_secretariat_all["AMOUNT"]
df_secretariat_all["year"] = df_secretariat_all["YEAR"]


def process_year(year: int) -> None:
    """Process and output entity spending for a single year."""
    # Filter CEB data to year
    df_system = df_system_all[df_system_all["calendar_year"] == year].copy()
    df_system = df_system.rename(columns={"agency": "entity"})
    df_system = df_system[["entity", "amount"]].reset_index(drop=True)
    
    # Filter secretariat data to year
    df_secretariat = df_secretariat_all[df_secretariat_all["year"] == year].copy()
    df_secretariat = (
        df_secretariat.groupby("entity")
        .agg({"amount": "sum"})
        .reset_index()
    )
    
    system_total = df_system["amount"].sum()
    secretariat_total = df_secretariat["amount"].sum()
    
    print(f"\n{year}:")
    print(f"  CEB total: ${system_total/1e9:.1f}B")
    print(f"  Secretariat total: ${secretariat_total/1e9:.1f}B")
    
    # Remove UN/UN-DPO from CEB (replaced by granular secretariat data)
    df_system_filtered = df_system[~df_system["entity"].isin(["UN", "UN-DPO"])]
    
    # Combine: CEB entities + Secretariat sub-entities
    df_combined = df_system_filtered.merge(
        df_secretariat, on="entity", how="outer", suffixes=("_system", "_secretariat")
    )
    df_combined["amount"] = df_combined["amount_system"].fillna(
        df_combined["amount_secretariat"]
    )
    df_combined["source"] = df_combined.apply(
        lambda row: "ceb"
        if pd.notna(row["amount_system"])
        else "secretariat"
        if pd.notna(row["amount_secretariat"])
        else None,
        axis=1,
    )
    
    # Validate
    combined_total = df_combined["amount"].sum()
    print(f"  Combined total: ${combined_total/1e9:.1f}B ({len(df_combined)} entities)")
    
    missing = entity_names.difference(set(df_combined["entity"].values))
    extra = set(df_combined["entity"].values).difference(entity_names)
    if missing:
        print(f"  Entities without data: {len(missing)}")
    if extra:
        print(f"  Extra entities: {extra}")
    
    # Output
    df_combined["year"] = year
    output = df_combined[["entity", "source", "year", "amount"]].to_dict(orient="records")
    
    output_file = f"public/data/entity-spending-{year}.json"
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Wrote {output_file}")


# Process all years
for year in YEARS:
    process_year(year)
