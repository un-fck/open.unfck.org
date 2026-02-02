"""Fuse CEB revenue data from multiple sources into unified contributor breakdown.

Tiered approach:
- 2013-2020: Gov donors + NonGov donors + single "Other" bucket
- 2021-2024: Full breakdown with "Other {category}" per contributor type
"""
import pandas as pd
from pathlib import Path

ceb = Path("data/ceb")
clean, fused = ceb / "clean", ceb / "fused"
fused.mkdir(exist_ok=True)

def load(filename: str) -> pd.DataFrame:
    return pd.read_csv(clean / filename)

def load_mapping() -> tuple[dict, dict]:
    """Load C-code mapping including alt_descriptors for normalization."""
    df = pd.read_csv(ceb / "contrib_types_mapping.csv")
    code_to_name = dict(zip(df["code"], df["name"]))
    desc_to_code = {}
    for _, row in df.iterrows():
        if pd.notna(row.get("alt_descriptors")) and row["alt_descriptors"]:
            for desc in str(row["alt_descriptors"]).split("|"):
                desc_to_code[desc.strip()] = row["code"]
    return code_to_name, desc_to_code

def normalize_contrib_type(ct: str, desc_to_code: dict) -> str | None:
    """Normalize contrib_type to C-code."""
    if pd.isna(ct): return None
    ct = str(ct).strip()
    if ct.startswith("C") and len(ct) <= 4: return ct
    if ct in ["1", "2"]: return None
    return desc_to_code.get(ct)

def fuse_revenue():
    code_to_name, desc_to_code = load_mapping()
    
    revenue = load("revenue.csv").rename(columns={"agency": "entity"})
    gov = load("revenue_government_donors.csv")
    nongov = load("revenue_non_gov_donors.csv")
    nongov["contrib_code"] = nongov["contrib_type"].apply(lambda x: normalize_contrib_type(x, desc_to_code))
    
    # Load contrib_type for Tier 2 (2021+)
    contrib_type = load("revenue_contrib_type.csv")
    
    results = []
    years = sorted(set(revenue["calendar_year"]) & set(gov["calendar_year"]))
    
    for year in years:
        rev_year = revenue[revenue["calendar_year"] == year]
        gov_year = gov[gov["calendar_year"] == year]
        nongov_year = nongov[nongov["calendar_year"] == year]
        ct_year = contrib_type[contrib_type["calendar_year"] == year] if year >= 2021 else None
        
        for entity in rev_year["entity"].unique():
            total = rev_year[rev_year["entity"] == entity]["amount"].sum()
            gov_ent = gov_year[gov_year["entity"] == entity]
            nongov_ent = nongov_year[nongov_year["entity"] == entity]
            
            # Government donors (always specific)
            for _, row in gov_ent.iterrows():
                results.append({
                    "entity": entity, "year": year, "contrib_code": "C01",
                    "donor_type": "Government", "donor_name": row.get("government_donor", "Unknown"),
                    "amount": row["amount"], "is_other": False
                })
            gov_total = gov_ent["amount"].sum()
            
            if year >= 2021 and ct_year is not None:
                # Tier 2: Break down by contributor type with "Other {type}"
                ct_ent = ct_year[ct_year["entity"] == entity]
                nongov_codes = [c for c in code_to_name.keys() if c not in ["C01", "C09"]]
                
                for code in nongov_codes:
                    cat_total = ct_ent[ct_ent["contrib_type"] == code]["amount"].sum()
                    if cat_total == 0: continue
                    
                    # Specific donors in this category
                    donors_in_cat = nongov_ent[nongov_ent["contrib_code"] == code]
                    donors_sum = 0
                    for _, row in donors_in_cat.iterrows():
                        results.append({
                            "entity": entity, "year": year, "contrib_code": code,
                            "donor_type": code_to_name[code], "donor_name": row.get("donor", "Unknown"),
                            "amount": row["amount"], "is_other": False
                        })
                        donors_sum += row["amount"]
                    
                    # "Other {type}" = category total - specific donors
                    other_cat = cat_total - donors_sum
                    if abs(other_cat) > 1000:
                        results.append({
                            "entity": entity, "year": year, "contrib_code": code,
                            "donor_type": code_to_name[code], "donor_name": f"Other {code_to_name[code]}",
                            "amount": other_cat, "is_other": True
                        })
                
                # C09 "No Contributor" (revenue from activities)
                c09_total = ct_ent[ct_ent["contrib_type"] == "C09"]["amount"].sum()
                if abs(c09_total) > 1000:
                    results.append({
                        "entity": entity, "year": year, "contrib_code": "C09",
                        "donor_type": "No Contributor", "donor_name": "Revenue from Activities",
                        "amount": c09_total, "is_other": True
                    })
            else:
                # Tier 1: NonGov donors + single "Other" bucket
                for _, row in nongov_ent.iterrows():
                    code = row.get("contrib_code")
                    dtype = code_to_name.get(code, "Non-Government") if code else "Non-Government"
                    results.append({
                        "entity": entity, "year": year, "contrib_code": code or "Unknown",
                        "donor_type": dtype, "donor_name": row.get("donor", "Unknown"),
                        "amount": row["amount"], "is_other": False
                    })
                nongov_total = nongov_ent["amount"].sum()
                
                other = total - gov_total - nongov_total
                if abs(other) > 1000:
                    results.append({
                        "entity": entity, "year": year, "contrib_code": "Other",
                        "donor_type": "Other", "donor_name": "Unattributed",
                        "amount": other, "is_other": True
                    })
    
    df = pd.DataFrame(results)
    df = df.sort_values(["year", "entity", "donor_type", "amount"], ascending=[True, True, True, False])
    df.to_csv(fused / "revenue_by_contributor.csv", index=False)
    print(f"Wrote {len(df)} rows to {fused / 'revenue_by_contributor.csv'}")
    
    validate(df, revenue, years)
    return df

def validate(df: pd.DataFrame, revenue: pd.DataFrame, years: list):
    """Run validation assertions on fused data."""
    print("\n=== Validation ===")
    
    for year in years:
        yr = df[df["year"] == year]
        fused_total = yr["amount"].sum()
        source_total = revenue[revenue["calendar_year"] == year]["amount"].sum()
        other_total = yr[yr["is_other"]]["amount"].sum()
        other_pct = other_total / fused_total * 100 if fused_total else 0
        
        diff_pct = abs(fused_total - source_total) / source_total * 100
        # 2024 contrib_type.csv is incomplete (~2% gap), allow larger tolerance
        tolerance = 2.0 if year == 2024 else 0.5
        assert diff_pct < tolerance, f"{year}: Fused {fused_total/1e9:.2f}B != source {source_total/1e9:.2f}B ({diff_pct:.2f}%)"
        assert fused_total > 30e9, f"{year}: Total {fused_total/1e9:.1f}B suspiciously low"
        
        if year >= 2021:
            other_types = yr[yr["is_other"]].groupby("donor_type")["amount"].sum()
            gap_note = " (contrib_type incomplete)" if diff_pct > 0.5 else ""
            print(f"{year}: Total={fused_total/1e9:.1f}B, Other: {len(other_types)} categories{gap_note} ✓")
        else:
            assert 5 < other_pct < 25, f"{year}: Other% {other_pct:.1f}% outside 5-25%"
    
    assert set(years) == set(df["year"].unique()), "Missing years"
    print(f"\nAll {len(years)} years validated.")

if __name__ == "__main__":
    fuse_revenue()
