# Data Availability

## CEB Financial Statistics

https://unsceb.org/financial-statistics

2011 - 2024

- **Revenue by Entity**
  - Total Revenue
    - Year
    - Entity
    - Revenue Type
    - Revenue Sub-Type
  - Revenue by Entity [same data, just more detailed visualization]
  - Revenue by Financing Intrument [same data, but with explanations for the Revenue Sub-Type codes]
- **Revenue by Donor**
  - Revenue by Government Donor
    - Year
    - Government Donor
    - Entity
    - Revenue Type
  - Revenue by Non-Government Donor
    - Year
    - Donor (e.g. EU, World Bank, MPTF, GEF, GFATM, OCHA, Gates Foundation, Gavi)
    - Entity
  - Revenue by Contributor Type [aggregation of the two above into categories]
    - Year
    - Contributor Type
    - Entity
    - Revenue Type
- **Expenses**
  - Total Expenses
    - Year
    - Entity
  - Expenses by Function
    - Year
    - Entity
    - Expense Function (Humanitarian Assistance / Development Assistance / Peace Operations / Global Agenda and Specialized Assistance / Other)
  - Expenses by Geographic Location
    - Year
    - Region
    - Subregion
    - Country
    - Entity
    - Location Type [= aggregation helper for subregion/region level]
  - Expenses by SDG
    - Year
    - Entity
    - SDG (only highest level, no subcodes)

In summary, we have the following cross-dimensions:
- Revenue: Year x Entity x Donor x Revenue Type
- Expenses: Year x Entity x Country
- Expenses: Year x Entity x Expense Function
- Expenses: Year x Entity x SDG

What would be nice and what is lacking is:
- Expenses: Year x Entity x Country x SDG
