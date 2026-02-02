import pandas as pd

ENTITY_MAPPING = {
    "UN-HABITAT": "UN-Habitat",
    "UNHABITAT": "UN-Habitat",
    "UNWOMEN": "UN-Women",
    "UNWTO": "UN Tourism",
    "OHRLLS": "UN-OHRLLS",
    "POE-CAR": "PoE-CAR",
    "POE-HAITI": "PoE-Haiti",
    "POE-LIBYA": "PoE-Libya",
    "POE-SUDAN": "PoE-Sudan",
    "POE-YEMEN": "PoE-Yemen",
    "POS-SSUDAN": "PoE-S.Sudan",
    "SRSG-CAAC": "OSRSG-CAAC",
    "SRSG-SVC": "OSRSG-SVC",
    "SRSG-VAC": "OSRSG-VAC",
    "OSESG-MYAN": "OSESG-Myanmar",
    "SESG-MYAN": "OSESG-Myanmar",
    "SESG-HAFRICA": "OSESG-Horn",
    "SESG-YEMEN": "OSESG-Yemen",
    "SC-RES1559": "OSESG-SCRES1559",
    "SASG-CYP": "OSASG-Cyprus",
    "PESG-WSAHARA": "PESG-WS",
    "OSESG-BDI": "OSESG-FG",
    "GEXP-DRC": "GoE-DRC",
    "UNGCO": "UNGC",
    "OVRA": "VRA",
    "ETHICS": "EO",
    "AOJ": "OAJ",
    "IM-MYANMAR": "IIMM",
    "OSET": "ODET",
    "RCS": "DCO",
    "UN-RGID": "UNRGID",
}

DONOR_CHAR_FIXES = {
    "C�te d'Ivoire": "Côte D'Ivoire",
    "T�rkiye": "Türkiye",
    "Cura�ao": "Curaçao",
}


def clean_donor_name(name: str) -> str:
    """Clean donor name for display: strip asterisks used for footnotes."""
    return name.replace("*", "").strip()


def parse_amount(amount_str: str | float) -> float:
    """Parse amount string to float, removing spaces and commas."""
    if isinstance(amount_str, (int, float)):
        return float(amount_str)
    cleaned = str(amount_str).replace(",", "").replace(" ", "").strip()
    if cleaned in ("", "-", "N/A", "n/a"):
        return 0.0
    return float(cleaned)


def normalize_entity(entity: str) -> str:
    """Normalize entity code to match entities.json."""
    return ENTITY_MAPPING.get(entity, entity)


def normalize_rev_type(rev_type: str) -> str:
    """Normalize revenue type to shorter, consistent labels.
    
    Handles both text descriptions and UN CEB R-codes:
    - R01, R02: Assessed contributions
    - R03-R05: Voluntary non-core (earmarked) contributions  
    - R07, R08, R08B: Voluntary core/non-core contributions
    - R09-R12: Non-government donors (multilateral, private, etc.)
    """
    lower = rev_type.lower().strip()
    
    # Text-based descriptions
    if "assessed" in lower:
        return "Assessed"
    if "voluntary core" in lower or "un-earmarked" in lower:
        return "Voluntary un-earmarked"
    if "voluntary non-core" in lower or "earmarked" in lower:
        return "Voluntary earmarked"
    
    # R-code based classifications
    upper = rev_type.upper().strip()
    if upper in ("R01", "R02", "R02A"):
        return "Assessed"
    if upper in ("R07", "R08", "R08B"):
        return "Voluntary un-earmarked"
    if upper in ("R03", "R03A", "R03B", "R03C", "R03D", "R03E", "R03F", 
                 "R04A", "R04B", "R04C", "R05", "R09", "R10", "R11", "R12"):
        return "Voluntary earmarked"
    
    return "Other"


def load_donor_revenue(year: int | None = None) -> pd.DataFrame:
    """Load and clean government donor revenue CSV."""
    df = pd.read_csv("data/government-donor-revenue.csv", encoding="utf-8")
    df["government_donor"] = df["government_donor"].replace(DONOR_CHAR_FIXES)
    df["amount"] = df["amount"].apply(parse_amount)
    df["entity"] = df["entity"].apply(normalize_entity)
    df["rev_type"] = df["rev_type"].apply(normalize_rev_type)
    # Exclude refunds and miscellaneous
    df = df[~df["rev_type"].isin(["Other"])]
    if year:
        df = df[df["calendar_year"] == year]
    return df


def load_non_gov_donor_revenue(year: int | None = None) -> pd.DataFrame:
    """Load and clean non-government donor revenue CSV."""
    df = pd.read_csv("data/revenue_non_gov_donors.csv", encoding="utf-8")
    df = df.rename(columns={"donor": "donor_name"})
    df["amount"] = df["amount"].apply(parse_amount)
    df["entity"] = df["entity"].apply(normalize_entity)
    df["rev_type"] = df["rev_type"].apply(normalize_rev_type)
    # Exclude refunds and miscellaneous
    df = df[~df["rev_type"].isin(["Other"])]
    if year:
        df = df[df["calendar_year"] == year]
    return df
