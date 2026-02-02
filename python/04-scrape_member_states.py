"""Scrape UN member states, observers, and payment status."""
import pandas as pd
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0"}
OUTPUT = Path("data/ceb/member_states.csv")

def scrape_members() -> list[str]:
    resp = requests.get("https://www.un.org/en/about-us/member-states", headers=UA)
    soup = BeautifulSoup(resp.text, "html.parser")
    return [h2.get_text().strip().replace("\u2019", "'") for h2 in soup.find_all("h2")
            if h2.get_text().strip() and "MEMBER STATES" not in h2.get_text().upper()
            and "Search" not in h2.get_text()]

def scrape_observers() -> list[str]:
    resp = requests.get("https://www.un.org/en/about-us/non-member-states", headers=UA)
    soup = BeautifulSoup(resp.text, "html.parser")
    return [h3.get_text().strip().replace("\u2019", "'") for h3 in soup.find_all("h3")
            if h3.get_text().strip() and "MEMBER" not in h3.get_text().upper()
            and "Quick links" not in h3.get_text()]

def scrape_payments() -> dict[str, dict]:
    resp = requests.get("https://www.un.org/en/ga/contributions/honourroll.shtml", headers=UA)
    soup = BeautifulSoup(resp.text, "html.parser")
    deadline = datetime(datetime.now().year, 2, 8)
    payments = {}
    for table in soup.find_all("table"):
        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if len(cells) >= 4:
                name = cells[1].get_text().strip().replace("*", "")
                date_str = cells[3].get_text().strip()
                if name and date_str and name != "Member State":
                    try:
                        paid = datetime.strptime(date_str, "%d-%b-%y")
                        status = "punctual" if paid <= deadline else "late"
                    except ValueError:
                        status = "punctual"
                    if name not in payments:
                        payments[name] = {"payment_date": date_str, "payment_status": status}
    return payments

# Name normalization for matching
NAME_MAP = {
    "Bahamas (The)": "Bahamas", "Gambia (Republic of The)": "Gambia",
    "Guinea Bissau": "Guinea-Bissau", "Netherlands (Kingdom of the)": "Netherlands",
    "China (the People's Republic of)": "China",
    "Cote d'Ivoire": "Côte D'Ivoire", "United Kingdom": "United Kingdom of Great Britain and Northern Ireland",
    "United States": "United States of America",
}

def normalize(name: str) -> str:
    return NAME_MAP.get(name, name)

if __name__ == "__main__":
    print("Scraping UN member states...")
    members = [normalize(m) for m in scrape_members()]
    observers = [normalize(o) for o in scrape_observers()]
    payments = {normalize(k): v for k, v in scrape_payments().items()}
    
    rows = []
    for m in members:
        p = payments.get(m, {})
        rows.append({"country": m, "status": "member", 
                     "payment_status": p.get("payment_status", ""), 
                     "payment_date": p.get("payment_date", "")})
    for o in observers:
        rows.append({"country": o, "status": "observer", "payment_status": "", "payment_date": ""})
    
    df = pd.DataFrame(rows)
    df.to_csv(OUTPUT, index=False)
    
    punctual = len(df[df["payment_status"] == "punctual"])
    late = len(df[df["payment_status"] == "late"])
    missing = len(df[(df["status"] == "member") & (df["payment_status"] == "")])
    print(f"Wrote {OUTPUT}: {len(members)} members, {len(observers)} observers")
    print(f"Payment status: {punctual} punctual, {late} late, {missing} missing")
