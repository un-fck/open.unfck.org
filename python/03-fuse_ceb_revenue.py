"""Fuse CEB revenue data from multiple sources into unified contributor breakdown.

Tiered approach:
- 2013-2020: Gov donors + NonGov donors + single "Other" bucket
- 2021-2024: Full breakdown with "Other {category}" per contributor type
"""
import pandas as pd
from pathlib import Path
from utils import clean_donor_name, NON_GOVERNMENT_DONORS, GENERIC_DONORS, DONOR_CATEGORY_OVERRIDES

ceb = Path("data/ceb")
clean, fused = ceb / "clean", ceb / "fused"
fused.mkdir(exist_ok=True)

def load(filename: str) -> pd.DataFrame:
    return pd.read_csv(clean / filename)

def load_contrib_mapping() -> tuple[dict, dict]:
    """Load C-code mapping including alt_descriptors for normalization."""
    df = pd.read_csv(ceb / "contrib_types_mapping.csv")
    code_to_name = dict(zip(df["code"], df["name"]))
    desc_to_code = {}
    for _, row in df.iterrows():
        if pd.notna(row.get("alt_descriptors")) and row["alt_descriptors"]:
            for desc in str(row["alt_descriptors"]).split("|"):
                desc_to_code[desc.strip()] = row["code"]
    return code_to_name, desc_to_code

def load_rev_type_mapping() -> dict:
    """Load rev_type text -> R-code mapping."""
    # Text descriptions to R-codes
    return {
        "Assessed Contributions": "R01", "Assessed contributions": "R01",
        "Voluntary core (un-earmarked) contributions": "R02A",
        "Voluntary non-core (earmarked) contributions": "R03E",  # Default to project-specific
        "Revenue from other activities": "R04A",
    }

def normalize_rev_type(rt: str, mapping: dict) -> str:
    """Normalize rev_type to R-code."""
    if pd.isna(rt): return "R03E"
    rt = str(rt).strip()
    if rt.startswith("R") and len(rt) <= 4:
        return rt.upper().replace("R08B", "R08B").replace("R08b", "R08B")
    return mapping.get(rt, "R03E")

def normalize_contrib_type(ct: str, desc_to_code: dict) -> str | None:
    """Normalize contrib_type to C-code."""
    if pd.isna(ct): return None
    ct = str(ct).strip()
    if ct.startswith("C") and len(ct) <= 4: return ct
    if ct in ["1", "2"]: return None
    return desc_to_code.get(ct)

def get_donor_info(donor_name: str, contrib_code: str | None, code_to_name: dict) -> tuple[str, str, str, bool]:
    """Get normalized donor info: (name, contrib_code, donor_type, is_other)."""
    name = clean_donor_name(donor_name)
    is_other = name in GENERIC_DONORS
    
    # Apply category override if exists
    if name in DONOR_CATEGORY_OVERRIDES:
        code = DONOR_CATEGORY_OVERRIDES[name]
    else:
        code = contrib_code
    
    dtype = code_to_name.get(code, "Non-Government") if code else "Non-Government"
    return name, code or "Unknown", dtype, is_other

def fuse_revenue():
    code_to_name, desc_to_code = load_contrib_mapping()
    rev_type_map = load_rev_type_mapping()
    
    revenue = load("revenue.csv").rename(columns={"agency": "entity"})
    gov = load("revenue_government_donors.csv")
    gov["rev_code"] = gov["rev_type"].apply(lambda x: normalize_rev_type(x, rev_type_map))
    
    nongov = load("revenue_non_gov_donors.csv")
    nongov["contrib_code"] = nongov["contrib_type"].apply(lambda x: normalize_contrib_type(x, desc_to_code))
    nongov["rev_code"] = nongov["rev_type"].apply(lambda x: normalize_rev_type(x, rev_type_map))
    
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
            
            # Government donors (always specific, with rev_type)
            for _, row in gov_ent.iterrows():
                donor = clean_donor_name(row.get("government_donor", "Unknown"))
                # Reclassify entries incorrectly labeled as government
                dtype = "Other" if donor in NON_GOVERNMENT_DONORS else "Government"
                ccode = "C08B" if donor in NON_GOVERNMENT_DONORS else "C01"
                results.append({
                    "entity": entity, "year": year, "contrib_code": ccode,
                    "rev_type": row["rev_code"], "donor_type": dtype,
                    "donor_name": donor, "amount": row["amount"], "is_other": False
                })
            gov_total = gov_ent["amount"].sum()
            
            if year >= 2021 and ct_year is not None:
                # Tier 2: Break down by contributor type × rev_type
                ct_ent = ct_year[ct_year["entity"] == entity]
                nongov_codes = [c for c in code_to_name.keys() if c not in ["C01", "C09"]]
                
                for code in nongov_codes:
                    ct_code = ct_ent[ct_ent["contrib_type"] == code]
                    if ct_code["amount"].sum() == 0: continue
                    
                    # Group by rev_type within this contrib_code
                    for rev_type in ct_code["rev_type"].unique():
                        cat_total = ct_code[ct_code["rev_type"] == rev_type]["amount"].sum()
                        if cat_total == 0: continue
                        
                        # Specific donors in this category × rev_type
                        donors_in = nongov_ent[(nongov_ent["contrib_code"] == code) & (nongov_ent["rev_code"] == rev_type)]
                        donors_sum = 0
                        for _, row in donors_in.iterrows():
                            name, dcode, dtype, is_other = get_donor_info(row.get("donor", "Unknown"), code, code_to_name)
                            results.append({
                                "entity": entity, "year": year, "contrib_code": dcode,
                                "rev_type": rev_type, "donor_type": dtype,
                                "donor_name": name, "amount": row["amount"], "is_other": is_other
                            })
                            donors_sum += row["amount"]
                        
                        # "Other {type}" for this rev_type
                        other_cat = cat_total - donors_sum
                        if abs(other_cat) > 1000:
                            results.append({
                                "entity": entity, "year": year, "contrib_code": code,
                                "rev_type": rev_type, "donor_type": code_to_name[code],
                                "donor_name": f"Other {code_to_name[code]}",
                                "amount": other_cat, "is_other": True
                            })
                
                # C09 "No Contributor" by rev_type
                c09 = ct_ent[ct_ent["contrib_type"] == "C09"]
                for rev_type in c09["rev_type"].unique():
                    amt = c09[c09["rev_type"] == rev_type]["amount"].sum()
                    if abs(amt) > 1000:
                        results.append({
                            "entity": entity, "year": year, "contrib_code": "C09",
                            "rev_type": rev_type, "donor_type": "No Contributor",
                            "donor_name": "Revenue from Activities",
                            "amount": amt, "is_other": True
                        })
            else:
                # Tier 1: NonGov donors + single "Other" bucket
                for _, row in nongov_ent.iterrows():
                    name, dcode, dtype, is_other = get_donor_info(row.get("donor", "Unknown"), row.get("contrib_code"), code_to_name)
                    results.append({
                        "entity": entity, "year": year, "contrib_code": dcode,
                        "rev_type": row["rev_code"], "donor_type": dtype,
                        "donor_name": name, "amount": row["amount"], "is_other": is_other
                    })
                nongov_total = nongov_ent["amount"].sum()
                
                other = total - gov_total - nongov_total
                if abs(other) > 1000:
                    results.append({
                        "entity": entity, "year": year, "contrib_code": "Other",
                        "rev_type": "R04A", "donor_type": "Other",
                        "donor_name": "Unattributed", "amount": other, "is_other": True
                    })
    
    df = pd.DataFrame(results)
    df = df.sort_values(["year", "entity", "donor_type", "rev_type", "amount"], ascending=[True, True, True, True, False])
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
        
        diff_pct = abs(fused_total - source_total) / source_total * 100
        tolerance = 2.0 if year == 2024 else 0.5
        assert diff_pct < tolerance, f"{year}: Fused {fused_total/1e9:.2f}B != source {source_total/1e9:.2f}B ({diff_pct:.2f}%)"
        assert fused_total > 30e9, f"{year}: Total {fused_total/1e9:.1f}B suspiciously low"
        
        if year >= 2021:
            rev_types = yr["rev_type"].nunique()
            gap = " (incomplete)" if diff_pct > 0.5 else ""
            print(f"{year}: {fused_total/1e9:.1f}B, {rev_types} rev_types{gap} ✓")
    
    assert set(years) == set(df["year"].unique()), "Missing years"
    print(f"\nAll {len(years)} years validated.")

if __name__ == "__main__":
    fuse_revenue()
