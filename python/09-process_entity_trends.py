"""Aggregate CEB revenue and expenses data into entity-trends.json."""

import json
from pathlib import Path
from collections import defaultdict
import pandas as pd
from utils import normalize_entity, parse_amount

DATA = Path(__file__).parent.parent / "public/data"
YEARS = list(range(2013, 2025))  # 2013-2024


def load_revenue() -> dict[str, dict[int, float]]:
    """Load revenue from pre-processed JSON files."""
    data = defaultdict(dict)
    for y in YEARS:
        path = DATA / f"entity-revenue-{y}.json"
        if not path.exists():
            continue
        for entity, info in json.loads(path.read_text()).items():
            data[entity][y] = info.get("total", 0)
    return dict(data)


def load_expenses() -> dict[str, dict[int, float]]:
    """Load expenses directly from CEB CSV."""
    df = pd.read_csv(Path(__file__).parent.parent / "data/un-system-expenses.csv")
    df["entity"] = df["agency"].apply(normalize_entity)
    df["amount"] = df["amount"].apply(parse_amount)
    df = df[df["calendar_year"].isin(YEARS)]
    data = defaultdict(dict)
    for _, row in df.groupby(["entity", "calendar_year"])["amount"].sum().items():
        entity, year = _
        data[entity][year] = row
    return dict(data)


def main():
    entities = json.loads((DATA / "entities.json").read_text())
    entity_to_group = {e["entity"]: e.get("system_grouping", "Other") for e in entities}
    groups = list(dict.fromkeys(e.get("system_grouping") for e in entities if e.get("system_grouping")))
    
    rev, exp = load_revenue(), load_expenses()
    all_entities = sorted(set(rev) | set(exp))
    
    entities_by_group = defaultdict(list)
    for e in all_entities:
        entities_by_group[entity_to_group.get(e, "Other")].append(e)
    
    def year_series(entity_set):
        return [{"year": y,
                 "revenue": sum(rev.get(e, {}).get(y, 0) or 0 for e in entity_set) or None,
                 "expenses": sum(exp.get(e, {}).get(y, 0) or 0 for e in entity_set) or None}
                for y in YEARS]
    
    output = {
        "meta": {"years": YEARS, "systemGroups": groups,
                 "entitiesByGroup": {g: entities_by_group[g] for g in groups if g in entities_by_group}},
        "aggregates": {"all": year_series(all_entities), **{g: year_series(entities_by_group[g]) for g in groups}},
        "entities": {e: [{"year": y, "revenue": rev.get(e, {}).get(y), "expenses": exp.get(e, {}).get(y)} for y in YEARS]
                     for e in all_entities}
    }
    
    out_path = DATA / "entity-trends.json"
    out_path.write_text(json.dumps(output, indent=2))
    print(f"Wrote {out_path}: {len(output['entities'])} entities, {len(groups)} groups, {YEARS[0]}-{YEARS[-1]}")


if __name__ == "__main__":
    main()
