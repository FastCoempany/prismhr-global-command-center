# -*- coding: utf-8 -*-
"""Build SHEET from three inputs: the pricing list (which countries exist),
the parsed PrismHR guides plus their corrections, and the 35 countries written
from public sources. Every row carries its lead — the country-specific facts
that run above the sixteen points."""
import csv, json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HERE, "..", "..")

guide = json.load(open(os.path.join(HERE, "guide-data.json")))
match = json.load(open(os.path.join(HERE, "pricing-to-slug.json")))
fill = json.load(open(os.path.join(HERE, "public-source-countries.json")))
leads = json.load(open(os.path.join(HERE, "leads.json")))

ALIAS = {
 "Kazakstan": "kazakhstan", "Czech Republic/Czechia": "czech czechia",
 "UAE": "united arab emirates dubai abu dhabi", "United States": "usa us america",
 "United Kingdom": "uk britain england scotland wales", "South Korea": "korea",
 "Hong Kong": "hk hongkong", "Trinidad and Tobago": "trinidad tobago",
 "Cayman Islands": "cayman", "Bahamas": "the bahamas", "Netherlands": "holland dutch",
 "Vietnam": "viet nam", "Saudi Arabia": "ksa saudi", "Puerto Rico": "pr",
}

rows = []
for r in csv.DictReader(open(os.path.join(REPO, "tools/pricing/eor-pricing.csv"))):
    c = r["Country"]
    slug = match.get(c, "")
    if slug:
        bl = guide[slug]
    elif c in fill:
        bl = fill[c]
    else:
        bl = []
    lead = leads.get(c, []) if bl else []
    blob = (ALIAS.get(c, "") + " " + " ".join(lead)).lower().strip()
    rows.append([c, slug, bl, blob, lead])

def js(v):
    return json.dumps(v, ensure_ascii=False)

withguide = sum(1 for r in rows if r[1])
written = sum(1 for r in rows if not r[1] and r[2])
nodata = sum(1 for r in rows if not r[2])
bullets = sum(len(r[2]) for r in rows)
leadlines = sum(len(r[4]) for r in rows)

head = f"""/* The country sheet — every country on the EOR pricing sheet ({len(rows)}).
   {withguide} countries are read from their own PrismHR global guide; {written} more had no guide
   published and were written from public sources, every bullet carrying the source it
   stands on. {nodata} have nothing yet.
   {bullets} bullets across the sixteen points: currency, VAT, payroll cycle, minimum wage,
   working hours, overtime, social security, healthcare, retirement, paid time off, public
   holidays, maternity, sick leave, probation, notice period and severance.
   Row shape: [country, guide slug, bullets, search blob, lead lines]. The lead runs above
   the sixteen and says what is specific to THIS country — {leadlines} lines in all. */
const SHEET = ["""

body = ",\n".join(js(r) for r in rows)
out = head + "\n" + body + "\n];\n"
io.open(os.path.join(HERE, "sheet-const.js.txt"), "w", encoding="utf-8").write(out)
print("rows", len(rows), "withguide", withguide, "written", written, "nodata", nodata,
      "bullets", bullets, "leadlines", leadlines, "bytes", len(out))
