"""Export UNINFO Cooperation Framework data to JSON for frontend."""
import json
from pathlib import Path
from collections import defaultdict
import country_converter as coco

RAW = Path("data/uninfo/raw")
OUT = Path("public/data")
COUNTRIES_DIR = OUT / "uninfo-countries"
cc = coco.CountryConverter()

def get_iso3(country: str) -> str | None:
    result = cc.convert(country, to="ISO3", not_found=None)
    return result[0] if isinstance(result, list) else result

def extract_metrics(item: dict) -> dict:
    metrics = {m["metricName"]: m["total"] for m in item.get("metrics", [])}
    return {
        "required": round(metrics.get("Total Required Resources", 0), 2),
        "available": round(metrics.get("Total Available Resources", 0), 2),
        "spent": round(metrics.get("Total Expenditure", 0), 2),
    }

def load_raw():
    return {
        "workspaces": json.loads((RAW / "workspaces.json").read_text()),
        "global_sdgs": json.loads((RAW / "global_sdgs.json").read_text()),
        "countries_sdgs": json.loads((RAW / "countries_sdgs.json").read_text()),
        "projects": json.loads((RAW / "projects_by_country.json").read_text()),
    }

def build_projects_by_country(data: dict) -> dict[str, list]:
    """Build projects list grouped by ISO3 code."""
    by_country = defaultdict(list)
    for country, agencies in data["projects"].items():
        iso3 = get_iso3(country)
        if not iso3 or not isinstance(agencies, list): continue
        for agency in agencies:
            abbr = agency.get("abbreviation", "")
            for proj in agency.get("planEntities", []):
                m = extract_metrics(proj)
                sdg = proj["sdgs"][0].get("id") if proj.get("sdgs") else None
                by_country[iso3].append({
                    "id": proj.get("id"),
                    "agency": abbr,
                    "sdg": sdg,
                    "name": proj.get("name", "")[:200],
                    "code": proj.get("code", ""),
                    **m,
                })
    # Sort each country's projects by required descending
    for iso3 in by_country:
        by_country[iso3].sort(key=lambda x: -x["required"])
    return dict(by_country)

def export_per_country(data: dict) -> dict:
    """Export per-country files with SDG breakdown and projects."""
    COUNTRIES_DIR.mkdir(exist_ok=True)
    
    # Build projects lookup
    projects_by_country = build_projects_by_country(data)
    
    # Build country data with SDGs and projects
    countries_index = {}
    total_projects = 0
    
    for country, info in data["countries_sdgs"].items():
        iso3 = get_iso3(country)
        if not iso3: continue
        
        ws_id = info["workspace_id"]
        sdgs = {}
        totals = {"required": 0, "available": 0, "spent": 0}
        
        for sdg in info.get("sdgs", []):
            if not sdg.get("id"): continue
            m = extract_metrics(sdg)
            sdgs[str(sdg["id"])] = m
            for k in totals: totals[k] += m[k]
        
        projects = projects_by_country.get(iso3, [])
        
        # Skip countries with no data
        if totals["required"] <= 0 and not projects:
            continue
        
        country_data = {
            "workspace_id": ws_id,
            "name": country,
            "totals": {k: round(v, 2) for k, v in totals.items()},
            "sdgs": sdgs,
            "projects": projects,
        }
        
        # Write per-country file
        (COUNTRIES_DIR / f"{iso3}.json").write_text(json.dumps(country_data))
        
        # Store in index (without projects for smaller index file)
        countries_index[iso3] = {
            "workspace_id": ws_id,
            "name": country,
            "totals": country_data["totals"],
            "project_count": len(projects),
        }
        total_projects += len(projects)
    
    # Write index file (for quick lookups without loading full data)
    (OUT / "uninfo-countries-index.json").write_text(json.dumps(countries_index, indent=2))
    
    print(f"uninfo-countries/: {len(countries_index)} country files")
    print(f"uninfo-countries-index.json: index with {len(countries_index)} countries")
    print(f"Total projects: {total_projects:,}")
    return countries_index

def export_sdgs(data: dict, countries_index: dict) -> dict:
    """Export per-SDG data with country breakdown."""
    # Need to load SDG data from country files
    result = {}
    for sdg in data["global_sdgs"]:
        if not sdg.get("id"): continue
        sdg_id = str(sdg["id"])
        m = extract_metrics(sdg)
        
        # Build country breakdown by reading from country files
        country_breakdown = {}
        for iso3 in countries_index:
            country_file = COUNTRIES_DIR / f"{iso3}.json"
            if country_file.exists():
                cdata = json.loads(country_file.read_text())
                if sdg_id in cdata.get("sdgs", {}):
                    country_breakdown[iso3] = cdata["sdgs"][sdg_id]
        
        # Top underfunded = highest gap (required - available)
        gaps = [(iso3, c["required"] - c["available"]) for iso3, c in country_breakdown.items()]
        top_underfunded = [iso3 for iso3, _ in sorted(gaps, key=lambda x: -x[1])[:10]]
        
        result[sdg_id] = {
            "name": sdg.get("short", sdg.get("name", "")),
            "totals": m,
            "countries": country_breakdown,
            "top_underfunded": top_underfunded,
        }
    
    (OUT / "uninfo-sdgs.json").write_text(json.dumps(result, indent=2))
    print(f"uninfo-sdgs.json: {len(result)} SDGs")
    return result

def update_manifest():
    """Update manifest with UNINFO data availability."""
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["uninfoCountries"] = {"years": [2024], "default": 2024, "min": 2024, "max": 2024}
    manifest["uninfoSdgs"] = {"years": [2024], "default": 2024, "min": 2024, "max": 2024}
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print("manifest.json: updated")

def cleanup_old_files():
    """Remove deprecated files."""
    old_files = [OUT / "uninfo-countries.json", OUT / "uninfo-projects.json"]
    for f in old_files:
        if f.exists():
            f.unlink()
            print(f"Removed deprecated: {f.name}")

if __name__ == "__main__":
    print("Loading raw UNINFO data...")
    data = load_raw()
    
    print("\nExporting per-country data...")
    countries_index = export_per_country(data)
    
    print("\nExporting SDGs...")
    export_sdgs(data, countries_index)
    
    print("\nUpdating manifest...")
    update_manifest()
    
    print("\nCleaning up old files...")
    cleanup_old_files()
    
    print("\nDone.")
