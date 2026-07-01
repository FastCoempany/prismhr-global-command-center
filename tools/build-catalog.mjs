// Compile docs/demo-catalog/entries/*.md into src/lib/catalog/catalog.json so
// the Next.js app can import the catalog without parsing markdown at runtime.
//
//   node tools/build-catalog.mjs
//
// Re-run whenever catalog entries change.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ENTRIES = 'docs/demo-catalog/entries';
const OUT_DIR = 'src/lib/catalog';
const OUT = path.join(OUT_DIR, 'catalog.json');

const MODULES = [
  ['dashboard', 'Dashboard'],
  ['new-hire', 'New Hire'],
  ['onboarding', 'Onboarding'],
  ['team', 'Team'],
  ['invoices', 'Invoices'],
  ['time-off', 'Time Off'],
  ['time-tracking', 'Time Tracking'],
  ['reimbursements', 'Reimbursements'],
  ['reports', 'Reports'],
  ['tools-resources', 'Tools & Resources'],
  ['settings', 'Settings'],
  ['support-cases', 'Support Cases'],
  ['worker-portal', 'Worker Portal'],
];

const scalar = (fm, k) => {
  const m = fm.match(new RegExp('^' + k + ':\\s*(.+)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};
const arrayField = (fm, k) => {
  const inline = fm.match(new RegExp('^' + k + ':\\s*\\[(.*)\\]\\s*$', 'm'));
  if (inline) {
    return inline[1]
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  const block = fm.match(new RegExp('^' + k + ':\\s*\\n((?:\\s+-\\s.*\\n?)+)', 'm'));
  if (!block) return [];
  return block[1]
    .split('\n')
    .filter((l) => /^\s*-\s/.test(l) && !/^\s*-\s*\{/.test(l))
    .map((l) => l.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
};
const elementsField = (fm) => {
  const block = fm.match(/^elements:\s*\n((?:\s+-\s.*\n?)+)/m);
  if (!block) return [];
  return block[1]
    .split('\n')
    .filter((l) => /^\s*-\s*\{/.test(l))
    .map((l) => {
      const name = (l.match(/name:\s*"([^"]*)"/) || [])[1] || '';
      const actionsRaw = (l.match(/actions:\s*\[([^\]]*)\]/) || [])[1] || '';
      const actions = actionsRaw
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      return { name, actions };
    })
    .filter((e) => e.name);
};

const listItems = (txt) =>
  txt
    .split('\n')
    .filter((l) => /^\s*-\s+/.test(l))
    .map((l) => l.replace(/^\s*-\s+/, '').trim())
    .filter(Boolean);

function parse(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const fm = m[1];
  const body = m[2];

  const sections = {};
  const parts = body.split(/\n##\s+/);
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const nl = chunk.indexOf('\n');
    const heading = chunk.slice(0, nl < 0 ? chunk.length : nl).trim();
    sections[heading] = chunk.slice(nl + 1);
  }

  const valueSec = sections['Value narrative (product-led, not discovery)'] || '';
  const subs = valueSec.split(/\n###\s+/);
  const grab = (label) => {
    const s = subs.find((x) => x.trim().toLowerCase().startsWith(label));
    return s ? listItems(s.slice(s.indexOf('\n') + 1)) : [];
  };

  const say = (sections['Say-this (talk track)'] || '')
    .split('\n')
    .filter((l) => /^\s*>/.test(l))
    .map((l) => l.replace(/^\s*>\s?/, '').trim())
    .join(' ')
    .trim();

  const what = (sections['What this screen is'] || '')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('<!--'))
    .join(' ')
    .trim();

  return {
    id: scalar(fm, 'id'),
    title: scalar(fm, 'title'),
    module: scalar(fm, 'module'),
    type: scalar(fm, 'type'),
    tier: scalar(fm, 'value_tier'),
    navPath: arrayField(fm, 'nav_path'),
    children: arrayField(fm, 'children_frontier'),
    tags: arrayField(fm, 'tags'),
    elements: elementsField(fm),
    what,
    capabilities: listItems(sections['Capabilities shown'] || ''),
    sp: grab('for service providers'),
    de: grab('for direct employers'),
    branching: listItems(sections['Branching'] || ''),
    say,
  };
}

const screens = readdirSync(ENTRIES)
  .filter((f) => f.endsWith('.md'))
  .map((f) => parse(readFileSync(path.join(ENTRIES, f), 'utf8')))
  .filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify({ modules: MODULES, screens }, null, 2));
console.log(`Wrote ${OUT} with ${screens.length} screens.`);
