"""Generate donors-{year}.json with contributions by entity and payment status."""

import json
import unicodedata
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from utils import clean_donor_name, load_donor_revenue, load_non_gov_donor_revenue

# Year range for donor data
YEARS = range(2013, 2025)  # 2013-2024
USER_AGENT = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}


def normalize_name(name: str) -> str:
    """Normalize country name for comparison: remove accents, asterisks, normalize punctuation, lowercase."""
    # Strip asterisks (used for footnotes like Kosovo**, Taiwan***)
    name = name.replace("*", "").strip()
    # Normalize unicode (NFD decomposition separates base chars from accents)
    normalized = unicodedata.normalize("NFD", name)
    # Remove accent marks (combining diacritical marks)
    ascii_name = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    # Normalize apostrophes and quotes to straight apostrophe
    ascii_name = ascii_name.replace("'", "'").replace("'", "'").replace("`", "'")
    # Lowercase for comparison
    return ascii_name.lower()


# Mappings for name normalization (scraped UN member list -> standard name)
STATE_MAPPING = {
    "Bahamas (The)": "Bahamas",
    "Gambia (Republic of The)": "Gambia",
    "Guinea Bissau": "Guinea-Bissau",
    "Netherlands (Kingdom of the)": "Netherlands",
    "Venezuela, Bolivarian Republic of": "Venezuela (Bolivarian Republic of)",
    "China (the People's Republic of)": "China",
}

# Non-country entries to exclude from donor data
EXCLUDED_DONORS = {
    "Refunds to donors/Miscellaneous",
    "JUNIOR PROFESSIONAL OFFICERS PROGRAMME",
    "Planethood Foundation",
    "Miscellaneous",
}
PAYMENT_STATE_MAPPING = {
    "Cote d'Ivoire": "Côte D'Ivoire",
    "United Kingdom": "United Kingdom of Great Britain and Northern Ireland",
    "United States": "United States of America",
}


def scrape_states() -> tuple[list[str], list[str]]:
    """Scrape UN member and observer states."""
    resp = requests.get("https://www.un.org/en/about-us/member-states", headers=USER_AGENT)
    soup = BeautifulSoup(resp.text, "html.parser")
    members = [h2.get_text().strip().replace("\u2019", "'") for h2 in soup.find_all("h2")
               if h2.get_text().strip() and "MEMBER STATES" not in h2.get_text() 
               and h2.get_text().strip() != "Search the United Nations"]
    
    resp = requests.get("https://www.un.org/en/about-us/non-member-states", headers=USER_AGENT)
    soup = BeautifulSoup(resp.text, "html.parser")
    observers = [h3.get_text().strip().replace("\u2019", "'") for h3 in soup.find_all("h3")
                 if h3.get_text().strip() not in ["MEMBER STATES", "Quick links for delegates"]]
    return members, observers


def scrape_payment_status() -> dict[str, dict]:
    """Scrape payment status from UN honour roll."""
    resp = requests.get("https://www.un.org/en/ga/contributions/honourroll.shtml", headers=USER_AGENT)
    soup = BeautifulSoup(resp.text, "html.parser")
    deadline = datetime(2026, 2, 8)
    payments = {}
    
    for table in soup.find_all("table"):
        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if len(cells) >= 4:
                name, date_str = cells[1].get_text().strip(), cells[3].get_text().strip()
                if name and date_str and name != "Member State":
                    try:
                        status = "punctual" if datetime.strptime(date_str, "%d-%b-%y") <= deadline else "late"
                    except ValueError:
                        status = "punctual"
                    if name not in payments:
                        payments[name] = {"payment_date": date_str, "payment_status": status}
    return payments


# Scrape state lists and payment status
print("Scraping UN member states and payment status...")
member_states, observer_states = scrape_states()
payment_status_raw = scrape_payment_status()
print(f"Found {len(member_states)} members, {len(observer_states)} observers, {len(payment_status_raw)} payment records")

# Normalize payment status names
payment_status = {PAYMENT_STATE_MAPPING.get(k.replace("*", "").strip(), k.replace("*", "").strip()): v 
                  for k, v in payment_status_raw.items()}

# Build state status mapping using normalized names for lookup
member_norm = [STATE_MAPPING.get(s, s) for s in member_states]
observer_norm = [STATE_MAPPING.get(s, s) for s in observer_states]

# Create lookup dict with normalized keys
normalized_status = {}
for s in member_norm:
    normalized_status[normalize_name(s)] = "member"
for s in observer_norm:
    normalized_status[normalize_name(s)] = "observer"

# Load all donor data and determine status using normalized name matching
df_all = load_donor_revenue(year=None)
all_donor_names = set(df_all["government_donor"].unique())
state_status = {}
for donor in all_donor_names:
    norm_donor = normalize_name(donor)
    if norm_donor in normalized_status:
        state_status[donor] = normalized_status[norm_donor]
    else:
        state_status[donor] = "nonmember"

# Process each year
for year in YEARS:
    df = load_donor_revenue(year=year)
    donor_names = set(df["government_donor"].unique()) - EXCLUDED_DONORS
    
    # Build contributions by donor for this year (merging by clean name)
    donor_contributions = {}
    for donor in donor_names:
        clean_name = clean_donor_name(donor)
        ddf = df[df["government_donor"] == donor]
        
        # Initialize or get existing entry for this clean name
        if clean_name not in donor_contributions:
            donor_contributions[clean_name] = {
                "status": state_status[donor],
                "contributions": {}
            }
        
        # Merge contributions
        contributions = donor_contributions[clean_name]["contributions"]
        for _, row in ddf.iterrows():
            entity, rev_type, amount = row["entity"], row["rev_type"], row["amount"]
            contributions.setdefault(entity, {}).setdefault(rev_type, 0)
            contributions[entity][rev_type] += amount
        
        # Only include payment status for latest year
        if year == 2024:
            if donor in payment_status:
                donor_contributions[clean_name].update(payment_status[donor])
            elif state_status[donor] in ["member", "observer"] and "payment_status" not in donor_contributions[clean_name]:
                donor_contributions[clean_name]["payment_status"] = "missing"
    
    gov_count = len(donor_contributions)
    
    # Process non-government donors for this year
    df_non_gov = load_non_gov_donor_revenue(year=year)
    non_gov_donor_names = set(df_non_gov["donor_name"].unique())
    
    for donor in non_gov_donor_names:
        clean_name = clean_donor_name(donor)
        ddf = df_non_gov[df_non_gov["donor_name"] == donor]
        
        # Initialize or get existing entry for this clean name
        if clean_name not in donor_contributions:
            donor_contributions[clean_name] = {
                "status": "organization",
                "contributions": {}
            }
        
        # Merge contributions
        contributions = donor_contributions[clean_name]["contributions"]
        for _, row in ddf.iterrows():
            entity, rev_type, amount = row["entity"], row["rev_type"], row["amount"]
            contributions.setdefault(entity, {}).setdefault(rev_type, 0)
            contributions[entity][rev_type] += amount
    
    non_gov_count = len(donor_contributions) - gov_count
    
    output_file = f"public/data/donors-{year}.json"
    with open(output_file, "w") as f:
        json.dump(donor_contributions, f, indent=2)
    print(f"Wrote {output_file} with {gov_count} gov donors + {non_gov_count} org donors")

# Summary for latest year
df_latest = load_donor_revenue(year=2024)
print(f"\n2024 stats:")
print(f"Punctual: {sum(1 for d in payment_status.values() if d.get('payment_status') == 'punctual')}")
print(f"Late: {sum(1 for d in payment_status.values() if d.get('payment_status') == 'late')}")
