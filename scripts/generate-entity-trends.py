#!/usr/bin/env python3
"""
Generate entity-trends.json from individual year files.

Data sources:
- entity-revenue-{year}.json (2013-2024): dict with entity codes as keys
- entity-spending-{year}.json (2019-2023): list of {entity, source, year, amount}
- entities.json: entity metadata including system_grouping
"""

import json
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path(__file__).parent.parent / "public" / "data"

REVENUE_YEARS = list(range(2013, 2025))  # 2013-2024
EXPENSES_YEARS = list(range(2019, 2024))  # 2019-2023

# System grouping order (for consistent output)
SYSTEM_GROUP_ORDER = [
    "UN Secretariat",
    "Peacekeeping Operations and Political Missions",
    "Regional Commissions",
    "Funds and Programmes",
    "Research and Training",
    "Subsidiary Organs",
    "International Court of Justice",
    "Specialized Agencies",
    "Related Organizations",
    "Other Entities",
    "Other Bodies",
]


def load_json(path: Path):
    with open(path) as f:
        return json.load(f)


def build_entity_to_group_map() -> dict[str, str]:
    """Build mapping from entity code to system_grouping."""
    entities = load_json(DATA_DIR / "entities.json")
    mapping = {}
    for e in entities:
        entity_code = e.get("entity")
        group = e.get("system_grouping")
        if entity_code and group:
            mapping[entity_code] = group
    return mapping


def load_revenue_data() -> dict[str, dict[int, float]]:
    """Load revenue data for all years. Returns {entity: {year: total}}."""
    data = defaultdict(dict)
    for year in REVENUE_YEARS:
        filepath = DATA_DIR / f"entity-revenue-{year}.json"
        if not filepath.exists():
            print(f"Warning: {filepath} not found")
            continue
        year_data = load_json(filepath)
        for entity, info in year_data.items():
            data[entity][year] = info.get("total", 0)
    return dict(data)


def load_expenses_data() -> dict[str, dict[int, float]]:
    """Load expenses data for all years. Returns {entity: {year: total}}."""
    data = defaultdict(lambda: defaultdict(float))
    for year in EXPENSES_YEARS:
        filepath = DATA_DIR / f"entity-spending-{year}.json"
        if not filepath.exists():
            print(f"Warning: {filepath} not found")
            continue
        year_data = load_json(filepath)
        for entry in year_data:
            entity = entry.get("entity")
            amount = entry.get("amount", 0)
            if entity:
                data[entity][year] += amount
    # Convert defaultdicts to regular dicts
    return {k: dict(v) for k, v in data.items()}


def build_entity_trends():
    """Build the complete entity-trends.json structure."""
    entity_to_group = build_entity_to_group_map()
    revenue_data = load_revenue_data()
    expenses_data = load_expenses_data()
    
    # Get all entities that have either revenue or expenses data
    all_entities = set(revenue_data.keys()) | set(expenses_data.keys())
    
    # Build entitiesByGroup mapping
    entities_by_group = defaultdict(list)
    for entity in sorted(all_entities):
        group = entity_to_group.get(entity)
        if group:
            entities_by_group[group].append(entity)
    
    # Sort groups by predefined order
    sorted_groups = []
    for g in SYSTEM_GROUP_ORDER:
        if g in entities_by_group:
            sorted_groups.append(g)
    # Add any groups not in the predefined order
    for g in entities_by_group:
        if g not in sorted_groups:
            sorted_groups.append(g)
    
    # Build entities_by_group with sorted groups
    entities_by_group_sorted = {g: entities_by_group[g] for g in sorted_groups}
    
    # Build meta
    meta = {
        "revenueYears": REVENUE_YEARS,
        "expensesYears": EXPENSES_YEARS,
        "systemGroups": sorted_groups,
        "entitiesByGroup": entities_by_group_sorted,
    }
    
    # All years (union of revenue and expenses years)
    all_years = sorted(set(REVENUE_YEARS) | set(EXPENSES_YEARS))
    
    # Build individual entity data
    entities_output = {}
    for entity in sorted(all_entities):
        entity_years = []
        for year in all_years:
            rev = revenue_data.get(entity, {}).get(year)
            exp = expenses_data.get(entity, {}).get(year)
            entity_years.append({
                "year": year,
                "revenue": rev,
                "expenses": exp,
            })
        entities_output[entity] = entity_years
    
    # Build aggregates
    aggregates = {}
    
    # "all" aggregate - sum across all entities
    all_agg = []
    for year in all_years:
        rev_total = sum(
            revenue_data.get(e, {}).get(year, 0) or 0
            for e in all_entities
        )
        exp_total = sum(
            expenses_data.get(e, {}).get(year, 0) or 0
            for e in all_entities
        )
        all_agg.append({
            "year": year,
            "revenue": rev_total if year in REVENUE_YEARS else None,
            "expenses": exp_total if year in EXPENSES_YEARS else None,
        })
    aggregates["all"] = all_agg
    
    # Per-group aggregates
    for group in sorted_groups:
        group_entities = entities_by_group[group]
        group_agg = []
        for year in all_years:
            rev_total = sum(
                revenue_data.get(e, {}).get(year, 0) or 0
                for e in group_entities
            )
            exp_total = sum(
                expenses_data.get(e, {}).get(year, 0) or 0
                for e in group_entities
            )
            group_agg.append({
                "year": year,
                "revenue": rev_total if year in REVENUE_YEARS else None,
                "expenses": exp_total if year in EXPENSES_YEARS else None,
            })
        aggregates[group] = group_agg
    
    return {
        "meta": meta,
        "aggregates": aggregates,
        "entities": entities_output,
    }


def main():
    print("Generating entity-trends.json...")
    data = build_entity_trends()
    
    output_path = DATA_DIR / "entity-trends.json"
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"Written to {output_path}")
    print(f"  - {len(data['meta']['systemGroups'])} system groups")
    print(f"  - {len(data['entities'])} entities")
    print(f"  - Revenue years: {data['meta']['revenueYears'][0]}-{data['meta']['revenueYears'][-1]}")
    print(f"  - Expenses years: {data['meta']['expensesYears'][0]}-{data['meta']['expensesYears'][-1]}")


if __name__ == "__main__":
    main()
