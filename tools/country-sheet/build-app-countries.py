# -*- coding: utf-8 -*-
"""Emit the app's country sheet from the same three inputs build-sheet.py joins.

build-sheet.py writes the mockup's `SHEET` const; this writes the production
module the Playbook reads, src/lib/playbook/countries.json. Same rows, same
order, same shape: [country, guide slug, bullets, search blob, lead lines].
Run it after leads.py and public-source-countries.py, exactly like build-sheet.
"""
import csv, json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HERE, "..", "..")
OUT = os.path.join(REPO, "src", "lib", "playbook", "countries.json")

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
    rows.append(
        {
            "n": c,
            "slug": slug,
            "alias": ALIAS.get(c, ""),
            "lead": lead,
            "points": bl,
        }
    )

withguide = sum(1 for r in rows if r["slug"])
written = sum(1 for r in rows if not r["slug"] and r["points"])
payload = {
    "priced": len(rows),
    "fromGuide": withguide,
    "fromPublicSources": written,
    "written": withguide + written,
    "bullets": sum(len(r["points"]) for r in rows),
    "leadLines": sum(len(r["lead"]) for r in rows),
    "rows": rows,
}
io.open(OUT, "w", encoding="utf-8").write(json.dumps(payload, ensure_ascii=False) + "\n")
print(OUT, "rows", len(rows), "written", withguide + written,
      "bytes", os.path.getsize(OUT))
