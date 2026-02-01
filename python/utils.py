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


def parse_amount(amount_str: str) -> float:
    """Parse amount string to float, removing spaces and commas."""
    return float(amount_str.replace(",", "").replace(" ", "").strip())


def normalize_entity(entity: str) -> str:
    """Normalize entity code to match entities.json."""
    return ENTITY_MAPPING.get(entity, entity)


def normalize_rev_type(rev_type: str) -> str:
    """Normalize revenue type to shorter, consistent labels."""
    lower = rev_type.lower()
    if "assessed" in lower:
        return "Assessed"
    if "voluntary core" in lower or "un-earmarked" in lower:
        return "Voluntary un-earmarked"
    if "voluntary non-core" in lower or "earmarked" in lower:
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
