// Compile the account CSV into src/lib/book/book.json — the static "book" of
// PEO partner accounts the command center runs on (mutable per-PEO state lives
// in the DB; this is the reference layer, same pattern as the demo catalog).
//
//   node tools/build-book.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const SRC = 'tools/book/accounts.csv';
const OUT_DIR = 'src/lib/book';
const OUT = path.join(OUT_DIR, 'book.json');

// --- minimal RFC-4180-ish CSV parser (quoted fields, embedded commas/quotes) ---
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

const rows = parseCsv(readFileSync(SRC, 'utf8'));
const header = rows.shift();
const col = (name) => header.indexOf(name);
const IDX = {
  id: col('18 Digit ID'),
  name: col('Account Name'),
  cloud: col('PrismHR Cloud Name'),
  size: col('Company Size'),
  contact: col('Primary Contact'),
  email: col('Primary Contact Email'),
  bucket: col('Estimated Company Size'),
  city: col('Billing City'),
  state: col('Billing State/Province'),
  csm: col('CSM Name'),
  website: col('Website'),
  lastActivity: col('Last Activity'),
  industry: col('Industry'),
};

// Fit-priority: bigger PEO = more downstream SMB clients = bigger global TAM;
// true PEO/ASO channels rank above staffing/corporate; recent activity nudges up.
const industryWeight = (ind) => {
  const i = (ind || '').toLowerCase();
  if (i.includes('peo')) return 1.0;
  if (i === 'aso') return 0.9;
  if (i.includes('payroll')) return 0.7;
  if (i.includes('accounting')) return 0.6;
  if (i.includes('staffing')) return 0.55;
  return 0.4; // corporate / insurance / unknown / blank
};
const sizeScore = (n) => {
  if (!n) return 0.25;
  if (n >= 10000) return 1.0;
  if (n >= 5000) return 0.9;
  if (n >= 2000) return 0.75;
  if (n >= 500) return 0.55;
  return 0.35;
};
const recencyBoost = (dateStr) => {
  // "M/D/YYYY"; recent (2026) = small boost, stale = slight penalty
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(dateStr || '');
  if (!m) return 0;
  const year = Number(m[3]);
  if (year >= 2026) return 0.05;
  if (year <= 2024) return -0.1;
  return 0;
};

const peos = rows
  .map((r) => {
    const size = parseInt((r[IDX.size] || '').replace(/[^0-9]/g, ''), 10) || 0;
    const industry = (r[IDX.industry] || '').trim();
    const raw = industryWeight(industry) * sizeScore(size) + recencyBoost(r[IDX.lastActivity]);
    const fit = Math.max(0, Math.min(100, Math.round(raw * 100)));
    return {
      id: (r[IDX.id] || '').trim(),
      name: (r[IDX.name] || '').trim(),
      cloud: (r[IDX.cloud] || '').trim(),
      csm: (r[IDX.csm] || '').trim() || 'Unassigned',
      contactName: (r[IDX.contact] || '').trim(),
      contactEmail: (r[IDX.email] || '').trim(),
      size,
      sizeBucket: (r[IDX.bucket] || '').trim(),
      industry: industry || 'Unknown',
      city: (r[IDX.city] || '').trim(),
      state: (r[IDX.state] || '').trim(),
      website: (r[IDX.website] || '').trim(),
      lastActivity: (r[IDX.lastActivity] || '').trim(),
      fit,
      fitTier: fit >= 70 ? 'high' : fit >= 45 ? 'medium' : 'low',
    };
  })
  .filter((p) => p.id && p.name)
  .sort((a, b) => b.fit - a.fit || a.name.localeCompare(b.name));

const csms = [...new Set(peos.map((p) => p.csm))].sort();

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify({ count: peos.length, csms, peos }, null, 2));
console.log(`Wrote ${OUT}: ${peos.length} PEOs, ${csms.length} CSMs.`);
console.log('fit tiers:', ['high', 'medium', 'low'].map((t) => `${t}=${peos.filter((p) => p.fitTier === t).length}`).join(' '));
