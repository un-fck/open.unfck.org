ENTITY_MAPPING = {
    "UN-HABITAT": "UN-Habitat", "UNHABITAT": "UN-Habitat",
    "UNWOMEN": "UN Women", "UN-Women": "UN Women", "UNWTO": "UN Tourism",
    "OHRLLS": "UN-OHRLLS", "POE-CAR": "PoE-CAR", "POE-HAITI": "PoE-Haiti",
    "POE-LIBYA": "PoE-Libya", "POE-SUDAN": "PoE-Sudan", "POE-YEMEN": "PoE-Yemen",
    "POS-SSUDAN": "PoE-S.Sudan", "SRSG-CAAC": "OSRSG-CAAC", "SRSG-SVC": "OSRSG-SVC",
    "SRSG-VAC": "OSRSG-VAC", "OSESG-MYAN": "OSESG-Myanmar", "SESG-MYAN": "OSESG-Myanmar",
    "SESG-HAFRICA": "OSESG-Horn", "SESG-YEMEN": "OSESG-Yemen", "SC-RES1559": "OSESG-SCRES1559",
    "SASG-CYP": "OSASG-Cyprus", "PESG-WSAHARA": "PESG-WS", "OSESG-BDI": "OSESG-FG",
    "GEXP-DRC": "GoE-DRC", "UNGCO": "UNGC", "OVRA": "VRA", "ETHICS": "EO",
    "AOJ": "OAJ", "IM-MYANMAR": "IIMM", "OSET": "ODET", "RCS": "DCO", "UN-RGID": "UNRGID",
}

def clean_donor_name(name: str) -> str:
    return name.replace("*", "").strip()

def parse_amount(amount_str: str | float) -> float:
    if isinstance(amount_str, (int, float)): return float(amount_str)
    cleaned = str(amount_str).replace(",", "").replace(" ", "").strip()
    return 0.0 if cleaned in ("", "-", "N/A", "n/a") else float(cleaned)

def normalize_entity(entity: str) -> str:
    return ENTITY_MAPPING.get(entity, entity)
