// Build a self-contained HTML mockup of the Demo Sidekick from the catalog
// entries. Parses docs/demo-catalog/entries/*.md into structured data and emits
// a single index.html (no build step, no deps) you can open in any browser.
//
//   node tools/demo-guide-mockup/build.mjs
//
// Output: tools/demo-guide-mockup/index.html

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ENTRIES = 'docs/demo-catalog/entries';
const OUT = 'tools/demo-guide-mockup/index.html';

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
  // inline [a, b] form
  const inline = fm.match(new RegExp('^' + k + ':\\s*\\[(.*)\\]\\s*$', 'm'));
  if (inline) {
    return inline[1]
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  // block  - item  form
  const re = new RegExp('^' + k + ':\\s*\\n((?:\\s+-\\s.*\\n?)+)', 'm');
  const block = fm.match(re);
  if (!block) return [];
  return block[1]
    .split('\n')
    .map((l) => l.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
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

  // split body into ## sections
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

  const sayRaw = sections['Say-this (talk track)'] || '';
  const say = sayRaw
    .split('\n')
    .filter((l) => /^\s*>/.test(l))
    .map((l) => l.replace(/^\s*>\s?/, '').trim())
    .join(' ')
    .trim();

  const whatRaw = sections['What this screen is'] || '';
  const what = whatRaw
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
    nav_path: arrayField(fm, 'nav_path'),
    children: arrayField(fm, 'children_frontier'),
    tags: arrayField(fm, 'tags'),
    what,
    capabilities: listItems(sections['Capabilities shown'] || ''),
    sp: grab('for the peo partner'),
    de: grab('for the smb client'),
    branching: listItems(sections['Branching'] || ''),
    say,
  };
}

const data = readdirSync(ENTRIES)
  .filter((f) => f.endsWith('.md'))
  .map((f) => parse(readFileSync(path.join(ENTRIES, f), 'utf8')))
  .filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PrismHR Global — Demo Sidekick (mockup)</title>
<style>
  :root {
    --navy:#0A1C40; --navy2:#0e2450; --blue:#2563eb; --blue-d:#1d4ed8;
    --orange:#e6701e; --bg:#F5F7FB; --card:#ffffff; --line:#e6ebf3;
    --ink:#0A1C40; --muted:#5b6b86; --green:#22c55e; --amber:#f59e0b;
  }
  * { box-sizing:border-box; }
  html,body { margin:0; height:100%; }
  body { font:15px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; color:var(--ink); background:var(--bg); }
  .app { display:grid; grid-template-columns:320px 1fr; height:100vh; }

  /* Sidebar */
  .side { background:var(--navy); color:#dfe6f2; display:flex; flex-direction:column; min-height:0; }
  .brand { display:flex; align-items:center; gap:10px; padding:16px 18px; border-bottom:1px solid rgba(255,255,255,.08); }
  .brand .logo { width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#fff,#c9d6ee);color:var(--navy);font-weight:800;display:grid;place-items:center;font-size:12px;letter-spacing:.5px; }
  .brand b { color:#fff; font-size:15px; } .brand span { color:#93a6c9; font-size:12px; display:block; }
  .search { padding:12px 14px; }
  .search input { width:100%; padding:9px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#fff; font-size:14px; }
  .search input::placeholder { color:#8ea3c7; }
  .nav { overflow:auto; padding:4px 8px 24px; flex:1; }
  .grp { margin:6px 4px 2px; }
  .grp h4 { color:#8ea3c7; font-size:11px; text-transform:uppercase; letter-spacing:.7px; margin:12px 8px 4px; }
  .item { display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:8px; cursor:pointer; color:#cdd8ec; font-size:13.5px; }
  .item:hover { background:rgba(255,255,255,.06); }
  .item.active { background:var(--blue); color:#fff; }
  .dot { width:7px;height:7px;border-radius:50%; flex:none; }
  .dot.high{background:var(--orange);} .dot.medium{background:var(--blue);} .dot.low{background:#5b6b86;}
  .count { margin-left:auto; font-size:11px; color:#7f93b7; }

  /* Main */
  .main { overflow:auto; min-height:0; }
  .top { position:sticky; top:0; background:rgba(245,247,251,.92); backdrop-filter:blur(6px); border-bottom:1px solid var(--line); padding:14px 28px; display:flex; align-items:center; gap:16px; z-index:5; }
  .crumb { color:var(--muted); font-size:12.5px; }
  .toggle { margin-left:auto; display:flex; background:#e7edf6; border-radius:9px; padding:3px; }
  .toggle button { border:0; background:transparent; padding:6px 12px; border-radius:7px; font-size:12.5px; font-weight:600; color:var(--muted); cursor:pointer; }
  .toggle button.on { background:#fff; color:var(--navy); box-shadow:0 1px 2px rgba(10,28,64,.12); }
  .wrap { max-width:860px; margin:0 auto; padding:26px 28px 80px; }
  h1 { font-size:26px; margin:0 0 6px; }
  .chips { display:flex; gap:8px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
  .chip { font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:20px; text-transform:uppercase; letter-spacing:.4px; }
  .chip.mod { background:#e7edf6; color:var(--navy); }
  .chip.tier-high{ background:#fde8d7; color:#b6531a; } .chip.tier-medium{ background:#dbe6fd; color:var(--blue-d);} .chip.tier-low{ background:#eef1f6; color:#5b6b86;}
  .chip.type { background:#eaf7ee; color:#1a7f3c; }

  .say { background:linear-gradient(135deg,var(--navy),var(--navy2)); color:#fff; border-radius:14px; padding:20px 22px; margin-bottom:22px; position:relative; box-shadow:0 8px 24px rgba(10,28,64,.18); }
  .say .lab { font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#9db4dc; margin-bottom:8px; display:flex; align-items:center; gap:7px;}
  .say p { margin:0; font-size:18px; line-height:1.55; }
  .say .accent { position:absolute; left:0; top:16px; bottom:16px; width:4px; background:var(--orange); border-radius:4px; }

  .sec { margin:0 0 22px; }
  .sec h3 { font-size:12px; text-transform:uppercase; letter-spacing:.7px; color:var(--muted); margin:0 0 10px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 18px; }
  ul.clean { margin:0; padding-left:20px; } ul.clean li { margin:6px 0; }
  .aud-block { margin-bottom:14px; }
  .aud-block .who { font-weight:700; font-size:13px; color:var(--blue-d); margin-bottom:6px; }
  .aud-block.de .who { color:var(--orange); }
  .branch { display:flex; gap:10px; padding:10px 0; border-top:1px dashed var(--line); }
  .branch:first-child { border-top:0; }
  .branch .ico { color:var(--orange); font-weight:800; flex:none; }
  .what { color:var(--muted); font-size:14px; }
  .jump { display:flex; flex-wrap:wrap; gap:8px; }
  .jump a { font-size:12.5px; padding:5px 10px; border-radius:8px; background:#eaf0f9; color:var(--navy); text-decoration:none; border:1px solid var(--line); cursor:pointer; }
  .jump a.dead { color:#93a2ba; cursor:default; }
  code { background:#eef2f8; padding:1px 5px; border-radius:5px; font-size:.9em; }
  .hint { color:var(--muted); font-size:12px; padding:2px 6px; }
</style>
</head>
<body>
<div class="app">
  <aside class="side">
    <div class="brand">
      <div class="logo">GBL</div>
      <div><b>Demo Sidekick</b><span>PrismHR Global · mockup</span></div>
    </div>
    <div class="search"><input id="q" placeholder="Search screens, modules, tags…" /></div>
    <div class="nav" id="nav"></div>
  </aside>
  <main class="main">
    <div class="top">
      <div class="crumb" id="crumb"></div>
      <div class="toggle" id="aud">
        <button data-a="both" class="on">Both</button>
        <button data-a="sp">PEO Partner</button>
        <button data-a="de">SMB Client</button>
      </div>
    </div>
    <div class="wrap" id="wrap"></div>
  </main>
</div>
<script>
const DATA = ${JSON.stringify(data)};
const MODULES = ${JSON.stringify(MODULES)};
let sel = DATA[0] ? DATA[0].id : null;
let aud = 'both';
let q = '';

function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function md(s){ return esc(s).replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>').replace(/\`(.+?)\`/g,'<code>$1</code>'); }
function byId(id){ return DATA.find(function(d){ return d.id===id; }); }
function tierRank(t){ return t==='high'?0:t==='medium'?1:2; }

function matches(d){
  if(!q) return true;
  var s=(d.title+' '+d.module+' '+(d.tags||[]).join(' ')).toLowerCase();
  return s.indexOf(q.toLowerCase())>=0;
}

function renderNav(){
  var nav=document.getElementById('nav'); nav.innerHTML='';
  MODULES.forEach(function(m){
    var key=m[0], label=m[1];
    var items=DATA.filter(function(d){ return d.module===key && matches(d); })
                  .sort(function(a,b){ return tierRank(a.tier)-tierRank(b.tier) || a.id.localeCompare(b.id); });
    if(!items.length) return;
    var g=document.createElement('div'); g.className='grp';
    var h=document.createElement('h4'); h.textContent=label + ' · ' + items.length; g.appendChild(h);
    items.forEach(function(d){
      var el=document.createElement('div'); el.className='item'+(d.id===sel?' active':'');
      el.innerHTML='<span class="dot '+d.tier+'"></span>'+esc(d.title);
      el.onclick=function(){ sel=d.id; render(); };
      g.appendChild(el);
    });
    nav.appendChild(g);
  });
  if(!nav.children.length){ nav.innerHTML='<div class="hint">No screens match "'+esc(q)+'"</div>'; }
}

function audBlock(d){
  var out='';
  function block(cls,who,items){
    if(!items||!items.length) return '';
    var lis=items.map(function(i){ return '<li>'+md(i)+'</li>'; }).join('');
    return '<div class="aud-block '+cls+'"><div class="who">'+who+'</div><ul class="clean">'+lis+'</ul></div>';
  }
  if(aud==='both'||aud==='sp') out+=block('sp','For the PEO partner (channel)',d.sp);
  if(aud==='both'||aud==='de') out+=block('de','For the SMB client (via their PEO)',d.de);
  return out || '<div class="what">No value narrative yet.</div>';
}

function render(){
  renderNav();
  var d=byId(sel); if(!d){ document.getElementById('wrap').innerHTML=''; return; }
  document.getElementById('crumb').textContent=(d.nav_path||[]).join('  ›  ');

  var caps=(d.capabilities||[]).map(function(c){ return '<li>'+md(c)+'</li>'; }).join('');
  var branch=(d.branching||[]).map(function(b){
    return '<div class="branch"><span class="ico">▸</span><span>'+md(b)+'</span></div>';
  }).join('');
  var jump=(d.children||[]).map(function(c){
    var t=byId_byTitle(c);
    return t ? '<a onclick="sel=\\''+t.id+'\\';render()">'+esc(c)+'</a>' : '<a class="dead" title="not yet cataloged">'+esc(c)+'</a>';
  }).join('');

  document.getElementById('wrap').innerHTML =
    '<h1>'+esc(d.title)+'</h1>'+
    '<div class="chips">'+
      '<span class="chip mod">'+esc(d.module)+'</span>'+
      '<span class="chip tier-'+d.tier+'">'+d.tier+' value</span>'+
      '<span class="chip type">'+esc(d.type)+'</span>'+
    '</div>'+
    (d.say ? '<div class="say"><span class="accent"></span><div class="lab">▶ Say this</div><p>'+md(d.say)+'</p></div>' : '')+
    (caps ? '<div class="sec"><h3>Capabilities shown</h3><div class="card"><ul class="clean">'+caps+'</ul></div></div>' : '')+
    '<div class="sec"><h3>Value narrative</h3><div class="card">'+audBlock(d)+'</div></div>'+
    (branch ? '<div class="sec"><h3>Branching</h3><div class="card">'+branch+'</div></div>' : '')+
    (d.what ? '<div class="sec"><h3>What this screen is</h3><div class="what">'+md(d.what)+'</div></div>' : '')+
    (jump ? '<div class="sec"><h3>Where you can go from here</h3><div class="jump">'+jump+'</div></div>' : '');
}

function byId_byTitle(label){
  // resolve a children_frontier label to an entry by loose title match
  var l=label.toLowerCase();
  return DATA.find(function(d){ return l.indexOf(d.title.toLowerCase())>=0 || d.title.toLowerCase().indexOf(l)>=0; });
}

document.getElementById('q').addEventListener('input',function(e){ q=e.target.value; renderNav(); });
document.getElementById('aud').addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b) return;
  aud=b.getAttribute('data-a');
  Array.prototype.forEach.call(this.children,function(x){ x.classList.toggle('on', x===b); });
  render();
});
render();
</script>
</body>
</html>`;

writeFileSync(OUT, html);
console.log('Wrote ' + OUT + ' with ' + data.length + ' screens.');
