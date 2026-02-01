"""Generate donors-{year}.json with contributions by entity and payment status."""

import json
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from utils import load_donor_revenue, normalize_rev_type

# Year range for donor data
YEARS = range(2013, 2025)  # 2013-2024
USER_AGENT = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

# Mappings for name normalization
STATE_MAPPING = {
    "Bahamas (The)": "Bahamas",
    "Gambia (Republic of The)": "Gambia",
    "Guinea Bissau": "Guinea-Bissau",
    "Netherlands (Kingdom of the)": "Netherlands",
    "Venezuela, Bolivarian Republic of": "Venezuela (Bolivarian Republic of)",
    "China (the People's Republic of)": "China",
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

# Build state status mapping
member_norm = [STATE_MAPPING.get(s, s) for s in member_states]
observer_norm = [STATE_MAPPING.get(s, s) for s in observer_states]
state_status = {s: "member" for s in member_norm} | {s: "observer" for s in observer_norm}

# Load all donor data to build complete state status mapping
df_all = load_donor_revenue(year=None)
all_donor_names = set(df_all["government_donor"].unique())
for donor in all_donor_names:
    if donor not in state_status:
        state_status[donor] = "nonmember"

# Process each year
for year in YEARS:
    df = load_donor_revenue(year=year)
    donor_names = set(df["government_donor"].unique())
    
    # Build contributions by donor for this year
    donor_contributions = {}
    for donor in donor_names:
        ddf = df[df["government_donor"] == donor]
        contributions = {}
        for _, row in ddf.iterrows():
            entity, rev_type, amount = row["entity"], row["rev_type"], row["amount"]
            contributions.setdefault(entity, {}).setdefault(rev_type, 0)
            contributions[entity][rev_type] += amount
        
        entry = {"status": state_status[donor], "contributions": contributions}
        # Only include payment status for latest year
        if year == 2024:
            if donor in payment_status:
                entry.update(payment_status[donor])
            elif state_status[donor] in ["member", "observer"]:
                entry["payment_status"] = "missing"
        donor_contributions[donor] = entry
    
    output_file = f"public/data/donors-{year}.json"
    with open(output_file, "w") as f:
        json.dump(donor_contributions, f, indent=2)
    print(f"Wrote {output_file} with {len(donor_contributions)} donors")

# Summary for latest year
df_latest = load_donor_revenue(year=2024)
print(f"\n2024 stats:")
print(f"Punctual: {sum(1 for d in payment_status.values() if d.get('payment_status') == 'punctual')}")
print(f"Late: {sum(1 for d in payment_status.values() if d.get('payment_status') == 'late')}")
