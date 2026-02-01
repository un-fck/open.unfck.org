# Data Fusion Methodology

This document explains how we combine multiple UN financial data sources to create a unified view of revenue and spending across the UN system.

## Data Sources

### 1. CEB Financial Statistics (Primary)

The UN System Chief Executives Board (CEB) collects annual financial data from 43+ UN entities.

| File | Content | Granularity |
|------|---------|-------------|
| `government-donor-revenue.csv` | Contributions by donor × entity × type | 47 top-level entities |
| `un-system-expenses.csv` | Expenses by entity | 47 top-level entities |

**Limitation**: CEB reports aggregate figures. The "UN" entity includes 70+ secretariat sub-entities bundled together. "UN-DPO" includes all peacekeeping missions.

### 2. UN Secretariat Financial Data (Supplementary)

More granular data for Secretariat sub-entities, sourced from the UN's internal financial systems.

| File | Content | Granularity |
|------|---------|-------------|
| `un-secretariat-expenses.csv` | Expenses by secretariat entity | 144 sub-entities (OCHA, DPPA, DSS, etc.) |

**Advantage**: Provides breakdown that CEB aggregates into "UN".

### 3. Entity Metadata

| File | Content |
|------|---------|
| `entities.json` | 187 entities with names, descriptions, system groupings, links |

## Revenue vs Spending: Different Granularity

| Metric | Source | Entities | Year |
|--------|--------|----------|------|
| **Revenue** | CEB donor data | 47 (aggregated) | 2024 |
| **Spending** | CEB + Secretariat | 187 (granular) | 2023 |

This asymmetry exists because:
- **Revenue** is reported at the level donors contribute (e.g., "to UN peacekeeping", not "to MONUSCO specifically")
- **Spending** can be tracked internally at sub-entity level

## Entity Mapping Challenges

### CEB Aggregates vs Our Granular Entities

| CEB Entity | Our `entities.json` | Notes |
|------------|---------------------|-------|
| `UN` | 70+ secretariat sub-entities | No direct match |
| `UN-DPO` | 36 PKM/SPM missions + `DPO` | No direct match |
| `WHO` | `WHO` | Direct match |
| `UNICEF` | `UNICEF` | Direct match |

### Entities with Dual Reporting

Some entities appear both in the CEB aggregate AND as separate CEB entries:

| Entity | In CEB as separate? | In `UN` aggregate? | Status |
|--------|--------------------|--------------------|--------|
| UNEP | ✓ ($485M) | Likely excluded | Autonomous governance |
| UNODC | ✓ ($369M) | Likely excluded | Autonomous governance |
| UN-Habitat | ✓ ($108M) | Likely excluded | Autonomous governance |
| ITC | ✓ ($50M) | Likely excluded | Joint UN/WTO |
| OCHA | ✗ | ✓ Included | Core Secretariat |
| DPPA | ✗ | ✓ Included | Core Secretariat |

## Processing Pipeline

### Revenue Data (`04-process_entity_revenue.py`)

```
government-donor-revenue.csv
    ↓ Filter to year 2024
    ↓ Normalize entity names
    ↓ Exclude refunds/miscellaneous
    ↓ Aggregate by entity
    ↓
entity-revenue.json
    - 46 entities
    - Total, by_type breakdown, by_donor breakdown
```

### Spending Data (`03-process_expenses_data.py`)

```
un-system-expenses.csv (CEB)
    ↓ Filter to year 2023
    ↓ Remove UN/UN-DPO (replaced by granular data)
    +
un-secretariat-expenses.csv
    ↓ Aggregate by entity
    ↓ Merge (CEB entities + secretariat sub-entities)
    ↓
entity-spending.json
    - 187 entities
    - Amount per entity
```

## App Implementation

### Treemap Visualization

The treemap supports two modes with different data:

#### Spending Mode (Default)
- **Data**: `entity-spending.json` (187 entities)
- **Grouping**: Uses `system_grouping` from `entities.json`
- **Categories**: UN Secretariat, PKM/SPM, Funds & Programmes, etc.

#### Revenue Mode
- **Data**: `entity-revenue.json` (46 entities)
- **Problem**: `UN` and `UN-DPO` have no matching entity in `entities.json`
- **Solution**: Create synthetic entities at runtime

### Synthetic Entities for Revenue Mode

| CEB Code | Synthetic Entity Name | System Grouping |
|----------|----------------------|-----------------|
| `UN` | "Other UN Secretariat (incl. Political Missions)" | UN Secretariat |
| `UN-DPO` | "Peacekeeping Operations" | Peacekeeping Operations |

These synthetic entities:
- Display descriptive names in the treemap (not abbreviations)
- Use appropriate colors matching their category
- Include full donor/type breakdowns in the sidebar

### Secretariat Entity Grouping

In revenue mode, entities with `system_grouping: "UN Secretariat"` are remapped to appear alongside the synthetic `UN` entity:

```
UN Secretariat (revenue view):
├── "Other UN Secretariat (incl. Political Missions)" — $6.32B (synthetic)
├── UNEP — $485M
├── UNODC — $369M
├── UN-Habitat — $108M
└── ITC — $50M
```

## Sidebar Data Display

The entity sidebar shows different data based on availability:

| Field | Spending Mode | Revenue Mode |
|-------|--------------|--------------|
| Total Spending | ✓ From `entity-spending.json` | ✓ If entity exists |
| Total Revenue | N/A or lookup | ✓ From `entity-revenue.json` |
| Revenue by Type | — | ✓ Assessed/Voluntary breakdown |
| Revenue by Donor | — | ✓ Top donors bar chart |
| Description | ✓ From `entities.json` | ✓ From `entities.json` |
| Impact Statements | ✓ From `impact.json` | ✓ From `impact.json` |

For secretariat sub-entities without revenue data, the sidebar displays:
> "Revenue data not available at sub-entity level"

## Known Limitations

1. **Year mismatch**: Revenue (2024) vs Spending (2023)
2. **Potential double-counting**: Unclear if `UN` aggregate excludes UNEP/UNODC/etc.
3. **No per-mission revenue**: Cannot show MONUSCO revenue (only aggregate UN-DPO)
4. **SPM in wrong category**: Political missions are in "PKM/SPM" but funded via Secretariat

## Future Improvements

1. Obtain per-mission revenue data (if available)
2. Clarify double-counting with CEB methodology team
3. Add historical year comparison
4. Separate SPM from PKM in categorization

_Explanation by Opus 4.5, Feb 1, 2025_
