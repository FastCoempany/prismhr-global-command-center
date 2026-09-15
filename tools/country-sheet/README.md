# The country sheet — source data

Source data for the Playbook's country wing. `build-app-countries.py` emits
`src/lib/playbook/countries.json`, which the shipped Playbook reads (The Sheet,
founder-decreed 2026-09-15). `build-sheet.py` still emits the mockup's own
`SHEET` const from the same three inputs.

## What is here

| File | What it is |
|---|---|
| `guide-data.json` | The sixteen points for the 60 countries PrismHR publishes a global guide for, parsed from the guide pages. |
| `guide-corrections.json` | The 97 bullets the guides had wrong, stale or missing, rewritten against a primary source. Re-applied on every re-parse, keyed `slug\|\|label`. |
| `public-source-countries.py` | The 35 countries on the pricing list with no PrismHR guide at all, written from public sources. Every bullet carries the source it stands on. Emits `public-source-countries.json`. |
| `leads.py` | The lead block for every country with data — the country-specific facts that run above the sixteen. Emits `leads.json`. |
| `pricing-to-slug.json` | Pricing-list country name → PrismHR guide slug. |
| `build-sheet.py` | Joins all of the above against `tools/pricing/eor-pricing.csv` and emits `sheet-const.js.txt`, the `SHEET` const the mockup reads. |
| `build-app-countries.py` | The same join, emitted as `src/lib/playbook/countries.json` — what the app reads. Commit the JSON: two of the three inputs are generated and gitignored. |

## Rebuilding

```
python3 tools/country-sheet/public-source-countries.py
python3 tools/country-sheet/leads.py
python3 tools/country-sheet/build-sheet.py
python3 tools/country-sheet/build-app-countries.py
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
