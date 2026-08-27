# The country sheet — source data

Concept-stage source data for the playbook's country sheet. Nothing here is wired
into the app; it is kept in the repo so the sourcing work survives the session.
The sheet itself is still a mockup and has not been shipped.

## What is here

| File | What it is |
|---|---|
| `guide-data.json` | The sixteen points for the 60 countries PrismHR publishes a global guide for, parsed from the guide pages. |
| `guide-corrections.json` | The 97 bullets the guides had wrong, stale or missing, rewritten against a primary source. Re-applied on every re-parse, keyed `slug\|\|label`. |
| `public-source-countries.py` | The 35 countries on the pricing list with no PrismHR guide at all, written from public sources. Every bullet carries the source it stands on. Emits `public-source-countries.json`. |
| `leads.py` | The lead block for every country with data — the country-specific facts that run above the sixteen. Emits `leads.json`. |
| `pricing-to-slug.json` | Pricing-list country name → PrismHR guide slug. |
| `build-sheet.py` | Joins all of the above against `tools/pricing/eor-pricing.csv` and emits `sheet-const.js.txt`, the `SHEET` const the mockup reads. |

## Rebuilding

```
python3 tools/country-sheet/public-source-countries.py
python3 tools/country-sheet/leads.py
python3 tools/country-sheet/build-sheet.py
```

## Coverage

197 countries priced. 60 read from their own guide, 35 written from public
sources, 102 with nothing yet — all of those below Tier 2 by volume or on the
Tier 3 list.

## Known defects in the PrismHR guides

Worth telling PrismHR about:

- The Puerto Rico guide carries three Portugal bullets (paid time off, maternity,
  severance).
- New Zealand's VAT is listed as 21%, which is the Netherlands' rate.
- Japan's retirement section claims there are no mandatory pensions.
- 30 countries have no social-security line at all; Brazil has no healthcare,
  retirement or social security line.
- 13 fields read "visit the website" instead of carrying a value.
