"""Generate contributor-trends.json with time series data for trend charts.

Creates pre-aggregated data for:
- Government vs Non-Government aggregate totals per year
- Individual contributor totals per year
- Revenue type breakdowns (assessed, voluntary earmarked, voluntary unearmarked)
"""

import json
from collections import defaultdict
import pandas as pd
from utils import clean_donor_name, load_donor_revenue, load_non_gov_donor_revenue

# Year range matching donor data
YEARS = list(range(2013, 2025))  # 2013-2024


def main():
    print("Processing contributor trends data...")
    
    # Load all years at once for efficiency
    df_gov = load_donor_revenue(year=None)
    df_non_gov = load_non_gov_donor_revenue(year=None)
    
    # Determine government status for each donor
    # member/observer = government, organization = non-government
    gov_donors = set()
    for donor in df_gov["government_donor"].unique():
        if pd.notna(donor):
            gov_donors.add(clean_donor_name(donor))
    
    non_gov_donors = set()
    for donor in df_non_gov["donor_name"].unique():
        if pd.notna(donor):
            non_gov_donors.add(clean_donor_name(donor))
    
    # Initialize data structures
    # contributor_data[donor_name][year] = {assessed, voluntary_earmarked, voluntary_unearmarked, total}
    contributor_data = defaultdict(lambda: defaultdict(lambda: {
        "assessed": 0,
        "voluntary_earmarked": 0,
        "voluntary_unearmarked": 0,
        "total": 0
    }))
    
    # Process government donors
    for _, row in df_gov.iterrows():
        if pd.isna(row["government_donor"]):
            continue
        year = int(row["calendar_year"])
        donor = clean_donor_name(row["government_donor"])
        rev_type = row["rev_type"]
        amount = row["amount"]
        
        if year not in YEARS:
            continue
        
        # Skip NaN amounts to avoid poisoning aggregates
        if pd.isna(amount):
            continue
        
        # Map revenue type to field
        if rev_type == "Assessed":
            contributor_data[donor][year]["assessed"] += amount
        elif rev_type == "Voluntary earmarked":
            contributor_data[donor][year]["voluntary_earmarked"] += amount
        elif rev_type == "Voluntary un-earmarked":
            contributor_data[donor][year]["voluntary_unearmarked"] += amount
        
        contributor_data[donor][year]["total"] += amount
    
    # Process non-government donors
    for _, row in df_non_gov.iterrows():
        if pd.isna(row["donor_name"]):
            continue
        year = int(row["calendar_year"])
        donor = clean_donor_name(row["donor_name"])
        rev_type = row["rev_type"]
        amount = row["amount"]
        
        if year not in YEARS:
            continue
        
        # Skip NaN amounts to avoid poisoning aggregates
        if pd.isna(amount):
            continue
        
        # Map revenue type to field
        if rev_type == "Assessed":
            contributor_data[donor][year]["assessed"] += amount
        elif rev_type == "Voluntary earmarked":
            contributor_data[donor][year]["voluntary_earmarked"] += amount
        elif rev_type == "Voluntary un-earmarked":
            contributor_data[donor][year]["voluntary_unearmarked"] += amount
        
        contributor_data[donor][year]["total"] += amount
    
    # Build output structure
    output = {
        "meta": {
            "years": YEARS,
            "governmentContributors": sorted(list(gov_donors)),
            "nonGovContributors": sorted(list(non_gov_donors))
        },
        "aggregates": {
            "gov": [],
            "non-gov": [],
            "all": []
        },
        "contributors": {}
    }
    
    # Calculate aggregates per year
    for year in YEARS:
        gov_totals = {"year": year, "assessed": 0, "voluntary_earmarked": 0, "voluntary_unearmarked": 0, "total": 0}
        non_gov_totals = {"year": year, "assessed": 0, "voluntary_earmarked": 0, "voluntary_unearmarked": 0, "total": 0}
        
        for donor in gov_donors:
            if year in contributor_data[donor]:
                data = contributor_data[donor][year]
                gov_totals["assessed"] += data["assessed"]
                gov_totals["voluntary_earmarked"] += data["voluntary_earmarked"]
                gov_totals["voluntary_unearmarked"] += data["voluntary_unearmarked"]
                gov_totals["total"] += data["total"]
        
        for donor in non_gov_donors:
            if year in contributor_data[donor]:
                data = contributor_data[donor][year]
                non_gov_totals["assessed"] += data["assessed"]
                non_gov_totals["voluntary_earmarked"] += data["voluntary_earmarked"]
                non_gov_totals["voluntary_unearmarked"] += data["voluntary_unearmarked"]
                non_gov_totals["total"] += data["total"]
        
        output["aggregates"]["gov"].append(gov_totals)
        output["aggregates"]["non-gov"].append(non_gov_totals)
        output["aggregates"]["all"].append({
            "year": year,
            "assessed": gov_totals["assessed"] + non_gov_totals["assessed"],
            "voluntary_earmarked": gov_totals["voluntary_earmarked"] + non_gov_totals["voluntary_earmarked"],
            "voluntary_unearmarked": gov_totals["voluntary_unearmarked"] + non_gov_totals["voluntary_unearmarked"],
            "total": gov_totals["total"] + non_gov_totals["total"]
        })
    
    # Build individual contributor time series
    all_contributors = gov_donors | non_gov_donors
    for donor in sorted(all_contributors):
        donor_series = []
        for year in YEARS:
            if year in contributor_data[donor]:
                data = contributor_data[donor][year]
                donor_series.append({
                    "year": year,
                    "assessed": data["assessed"],
                    "voluntary_earmarked": data["voluntary_earmarked"],
                    "voluntary_unearmarked": data["voluntary_unearmarked"],
                    "total": data["total"]
                })
            else:
                # Include year with zero values for complete time series
                donor_series.append({
                    "year": year,
                    "assessed": 0,
                    "voluntary_earmarked": 0,
                    "voluntary_unearmarked": 0,
                    "total": 0
                })
        output["contributors"][donor] = donor_series
    
    # Write output (replace NaN with 0 for valid JSON)
    output_file = "public/data/contributor-trends.json"
    
    def sanitize_value(v):
        """Replace NaN/Inf with 0 for valid JSON."""
        if isinstance(v, float) and (pd.isna(v) or v != v):  # NaN check
            return 0
        return v
    
    def sanitize_dict(d):
        """Recursively sanitize a dict/list structure."""
        if isinstance(d, dict):
            return {k: sanitize_dict(v) for k, v in d.items()}
        elif isinstance(d, list):
            return [sanitize_dict(v) for v in d]
        else:
            return sanitize_value(d)
    
    output = sanitize_dict(output)
    
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)
    
    # Calculate file size
    import os
    file_size = os.path.getsize(output_file)
    print(f"Wrote {output_file}")
    print(f"  File size: {file_size / 1024:.1f} KB")
    print(f"  Years: {YEARS[0]}-{YEARS[-1]}")
    print(f"  Government contributors: {len(gov_donors)}")
    print(f"  Non-government contributors: {len(non_gov_donors)}")
    print(f"  Total contributors: {len(all_contributors)}")


if __name__ == "__main__":
    main()
