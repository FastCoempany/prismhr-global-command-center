"use client";

// The Sheet — the Playbook's face, product first (triptych winner, ship order
// 2026-09-15). Three panels, all in view at once:
//
//   left    the country, typed the moment they name it
//   middle  the product, read the way its flyer reads
//   right   what partners say about that product, and how we respond
//
// Under the right panel, fixed: the questions asked on every call whatever the
// product. Opening a cue pins the countries it names into the wing, so the
// country detail is already up when the sentence lands.

import { useCallback, useMemo, useRef, useState } from "react";
import {
  BETWEEN,
  ISSUES,
  ISSUE_ORDER,
  PRODUCTS,
  cue as cueById,
  cuesFor,
  product as productById,
  type Cite,
  type Cue,
  type Product,
  type Rung,
} from "@/lib/playbook/products";
import type { CountryCard, CountryRow } from "@/lib/playbook/countries";
import styles from "./product-sheet.module.css";

const RUNG_LABEL: Record<Rung, string> = {
  tape: "ON TAPE",
  filed: "FILED",
  research: "RESEARCH",
  none: "∅",
};

const VERDICT_WORD: Record<string, string> = {
  ok: "Yes.",
  note: "Note.",
  ask: "Ask first.",
  no: "No.",
};

// Named apart from the ask list's own class: one CSS module, one namespace.
const VERDICT_CLASS: Record<string, string> = {
  ok: "vOk",
  note: "vNote",
  ask: "vAsk",
  no: "vNo",
};

/** Long values on the sixteen get one line and a door to the rest. */
const CUT = 150;

function RungChip({ rung, src }: { rung: Rung; src?: string }) {
  return (
    <span className={`${styles.rung} ${styles[rung]}`}>
      {RUNG_LABEL[rung]}
      {src ? ` · ${src}` : ""}
    </span>
  );
}

function Cites({ ev }: { ev: Cite[] }) {
  if (ev.length === 0) return null;
  return (
    <div className={styles.srcs}>
      {ev.map(([text, rung, src], i) => (
        <div className={styles.src} key={`${text}-${i}`}>
          <RungChip rung={rung} src={src} />
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}

/* ══ the left wing · the country ═══════════════════════════════════════════ */

function search(q: string, index: CountryRow[]): CountryRow[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const starts: CountryRow[] = [];
  const inside: CountryRow[] = [];
  const byAlias: CountryRow[] = [];
  for (const r of index) {
    const n = r.name.toLowerCase();
    if (n.startsWith(s)) starts.push(r);
    else if (n.includes(s)) inside.push(r);
    else if (r.alias && r.alias.split(/\s+/).some((a) => a.startsWith(s)))
      byAlias.push(r);
  }
  return [...starts, ...inside, ...byAlias].slice(0, 7);
}

function hitLine(r: CountryRow): string {
  if (!r.priced) return "not on our list";
  if (r.points === 0) return "priced, nothing written yet";
  return `${r.points} points on file`;
}

function SixteenValue({ value, source }: { value: string; source?: string }) {
  const [full, setFull] = useState(false);
  const long = value.length > CUT;
  const shown = long && !full ? `${value.slice(0, CUT).replace(/\s+\S*$/, "")}…` : value;
  return (
    <>
      <span className={styles.sv}>{shown}</span>
      {long && !full && (
        <button type="button" className={styles.sx} onClick={() => setFull(true)}>
          the rest
        </button>
      )}
      {source && <span className={styles.ssrc}>{source}</span>}
    </>
  );
}

/** The card for one country. Keyed by name where it is rendered, so the
 *  sixteen fold closes itself when the operator moves to another country. */
function CountryCardView({ card }: { card: CountryCard }) {
  const [six, setSix] = useState(false);
  return (
    <>
      <div className={`${styles.can} ${styles[VERDICT_CLASS[card.verdict]]}`}>
        <b>{VERDICT_WORD[card.verdict]}</b>
        <span>
          {card.verdictLine} <RungChip rung={card.verdictRung} />
        </span>
      </div>
      <h3 className={styles.cName}>{card.name}</h3>
      {!card.priced && (
        <>
          <p className={styles.cSub}>Not on the price list.</p>
          <div className={styles.gap}>∅ Nothing to quote here. Say that plainly.</div>
        </>
      )}
      {card.priced && card.sixteen.length === 0 && (
        <>
          <p className={styles.cSub}>Priced. Nothing written up yet.</p>
          <div className={styles.gap}>
            ∅ Nothing on any rung for this one yet. Say you will get the specifics today
            rather than guess at them.
          </div>
        </>
      )}
      {card.sixteen.length > 0 && (
        <>
          <p className={styles.cSub}>
            {card.sixteen.length} points on file · what makes this one a project
          </p>
          <ul className={styles.lead}>
            {card.lead.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <button type="button" className={styles.more} onClick={() => setSix((v) => !v)}>
            The sixteen points<span className={styles.cv}>{six ? "−" : "+"}</span>
          </button>
          {six && (
            <ul className={styles.six}>
              {card.sixteen.map((p) => (
                <li key={p.label}>
                  <span className={styles.sl}>{p.label}</span>
                  <SixteenValue value={p.value} source={p.source} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function CountryWing({
  index,
  tally,
  pins,
  current,
  card,
  state,
  onPick,
}: {
  index: CountryRow[];
  tally: { priced: number; written: number };
  pins: string[];
  current: string;
  card: CountryCard | null;
  state: "idle" | "reading" | "ready" | "lost";
  onPick: (name: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [hi, setHi] = useState(0);
  const hits = useMemo(() => search(typed, index), [typed, index]);

  const take = (name: string) => {
    onPick(name);
    setTyped("");
    setHi(0);
  };

  return (
    <aside className={styles.wing}>
      <div className={styles.wingHead}>
        <span className={styles.kick}>The country</span>
        <span className={styles.wingN}>
          {tally.priced} priced · {tally.written} written
        </span>
      </div>
      <div className={styles.field}>
        <input
          type="text"
          autoComplete="off"
          aria-label="Country"
          placeholder="They named a country"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setHi(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              setHi((v) => Math.min(v + 1, hits.length - 1));
              e.preventDefault();
            } else if (e.key === "ArrowUp") {
              setHi((v) => Math.max(v - 1, 0));
              e.preventDefault();
            } else if (e.key === "Enter") {
              if (hits[hi]) take(hits[hi].name);
              e.preventDefault();
            } else if (e.key === "Escape") {
              setTyped("");
            }
          }}
        />
        {hits.length > 0 && (
          <div className={styles.hits}>
            {hits.map((h, i) => (
              <button
                type="button"
                key={h.name}
                className={`${styles.hit} ${i === hi ? styles.hitCur : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  take(h.name);
                }}
              >
                <span className={styles.hk}>{hitLine(h)}</span>
                {h.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {pins.length > 0 && (
        <div className={styles.pins}>
          {pins.map((p) => (
            <button
              type="button"
              key={p}
              className={`${styles.pin} ${p === current ? styles.pinOn : ""}`}
              onClick={() => onPick(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <div className={styles.wingBody}>
        {!current && (
          <div className={styles.wingEmpty}>
            Type it the moment they say it. The lead lines come first; the sixteen sit
            behind one line.
          </div>
        )}
        {current && state === "reading" && (
          <div className={styles.wingEmpty}>Reading the sheet.</div>
        )}
        {current && state === "lost" && (
          <div className={styles.wingEmpty}>
            The sheet did not come back. Type it again.
          </div>
        )}
        {current && state === "ready" && card && (
          <CountryCardView card={card} key={card.name} />
        )}
      </div>
    </aside>
  );
}

/* ══ the middle · the product, the way its flyer reads ═════════════════════ */

function ProductPanel({ p }: { p: Product }) {
  return (
    <article className={styles.sheet}>
      <header className={styles.ph}>
        <span className={styles.kick}>{p.flyer}</span>
        <h1>
          {p.name}
          {p.sub && <small>{p.sub}</small>}
        </h1>
        <p className={styles.one}>{p.one}</p>
        <p className={styles.lang}>
          <span className={styles.ik}>In their language</span>
          {p.lang}
        </p>
      </header>

      <section className={styles.sec}>
        <h2>What it solves</h2>
        {ISSUE_ORDER.map((issue) => {
          const s = p.solves[issue];
          return (
            <section className={styles.blk} key={issue}>
              <span className={styles.kick}>{ISSUES[issue]}</span>
              <h3>{s.head}</h3>
              <p>{s.body}</p>
              {s.pts.length > 0 && (
                <ul className={styles.fpts}>
                  {s.pts.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
              <Cites ev={s.ev} />
            </section>
          );
        })}
      </section>

      <section className={styles.sec}>
        <h2>How it runs</h2>
        <ol className={styles.how}>
          {p.how.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
      </section>

      <section className={styles.sec}>
        <h2>We do, they keep</h2>
        <div className={styles.wt}>
          <div>
            <span className={styles.kick}>We do</span>
            <ul>
              {p.we.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className={styles.kick}>They keep</span>
            <ul>
              {p.they.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {p.tiers.length > 0 && (
        <section className={styles.sec}>
          <h2>From the flyer</h2>
          <div className={`${styles.tiers} ${styles[`n${p.tiers.length}`] ?? ""}`}>
            {p.tiers.map((t) => (
              <div className={styles.tier} key={t.name}>
                <span className={styles.kick}>{t.name}</span>
                <p className={styles.who}>{t.who}</p>
                <ul>
                  {t.pts.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Cites ev={[[p.flyer, "filed", "flyer"]]} />
        </section>
      )}

      <section className={styles.sec}>
        <h2>Time, and what is in the price</h2>
        <p>
          <span className={styles.ik}>Time</span>
          {p.time}
        </p>
        <p>
          <span className={styles.ik}>Price</span>
          {p.money}
        </p>
        {p.watch && (
          <p>
            <span className={styles.ik}>Watch</span>
            {p.watch}
          </p>
        )}
      </section>

      <section className={styles.sec}>
        <h2>Ask them</h2>
        <ul className={styles.ask}>
          {p.ask.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}

/* ══ the right · what they say, and the between-us foot ════════════════════ */

function CueRow({
  c,
  open,
  onOpen,
  onGo,
}: {
  c: Cue;
  open: boolean;
  onOpen: () => void;
  onGo: (id: string) => void;
}) {
  const p = productById(c.p);
  return (
    <div className={`${styles.srow} ${open ? styles.srowOn : ""}`}>
      <button type="button" className={styles.sq} onClick={onOpen}>
        <span className={styles.cue}>&ldquo;{c.cue}&rdquo;</span>
        <span className={styles.gist}>{c.gist}</span>
      </button>
      {open && (
        <div className={styles.sdepth}>
          <ul className={styles.resp}>
            {c.respond.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {c.ask.length > 0 && p && (
            <>
              <div className={`${styles.kick} ${styles.k2}`}>Ask them</div>
              <ul className={styles.ask}>
                {c.ask
                  .map((i) => p.ask[i])
                  .filter(Boolean)
                  .map((a) => (
                    <li key={a}>{a}</li>
                  ))}
              </ul>
            </>
          )}
          {c.also && c.also.length > 0 && (
            <div className={styles.also}>
              {c.also.map(([id, when]) => (
                <div key={id}>
                  <button type="button" className={styles.lnk} onClick={() => onGo(id)}>
                    → {productById(id)?.name ?? id}
                  </button>
                  <span>{when}</span>
                </div>
              ))}
            </div>
          )}
          <Cites ev={c.ev} />
        </div>
      )}
    </div>
  );
}

function BetweenFoot({
  open,
  onOpen,
  full,
}: {
  open: number | null;
  onOpen: (i: number | null) => void;
  full: boolean;
}) {
  return (
    <div className={`${styles.foot} ${full ? styles.footFull : ""}`}>
      <div className={styles.kick}>Between us · asked on every call</div>
      {BETWEEN.map((b, i) => (
        <div key={b.q} className={`${styles.bq} ${open === i ? styles.bqOn : ""}`}>
          <button type="button" onClick={() => onOpen(open === i ? null : i)}>
            {b.q}
          </button>
          {open === i && (
            <div className={styles.ba}>
              <p>{b.a}</p>
              <Cites ev={b.ev} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ══ the face ══════════════════════════════════════════════════════════════ */

export function ProductSheet({
  index,
  tally,
}: {
  index: CountryRow[];
  tally: { priced: number; written: number };
}) {
  const [productId, setProductId] = useState("");
  const [openCue, setOpenCue] = useState("");
  const [openBetween, setOpenBetween] = useState<number | null>(null);

  const [pins, setPins] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [card, setCard] = useState<CountryCard | null>(null);
  const [state, setState] = useState<"idle" | "reading" | "ready" | "lost">("idle");
  const cache = useRef(new Map<string, CountryCard>());
  const byName = useMemo(
    () => new Map(index.map((r) => [r.name.toLowerCase(), r.name])),
    [index],
  );

  const pick = useCallback(
    (raw: string) => {
      const name = byName.get(raw.trim().toLowerCase()) ?? raw.trim();
      if (!name) return;
      setPins((ps) => (ps.includes(name) ? ps : [...ps, name].slice(-6)));
      setCurrent(name);
      const held = cache.current.get(name);
      if (held) {
        setCard(held);
        setState("ready");
        return;
      }
      setCard(null);
      setState("reading");
      void (async () => {
        try {
          const res = await fetch(`/playbook/country?c=${encodeURIComponent(name)}`);
          const body = (await res.json()) as { ok: boolean; card?: CountryCard };
          if (!body.ok || !body.card) {
            setState("lost");
            return;
          }
          cache.current.set(name, body.card);
          setCard(body.card);
          setState("ready");
        } catch {
          setState("lost");
        }
      })();
    },
    [byName],
  );

  const openProduct = (id: string) => {
    setProductId(id);
    setOpenCue("");
  };

  const takeCue = (id: string) => {
    const next = openCue === id ? "" : id;
    setOpenCue(next);
    if (next) for (const c of cueById(next)?.cty ?? []) pick(c);
  };

  const p = productId ? (productById(productId) ?? null) : null;

  return (
    <div className={styles.trio}>
      <CountryWing
        index={index}
        tally={tally}
        pins={pins}
        current={current}
        card={card}
        state={state}
        onPick={pick}
      />

      <div className={styles.main}>
        {!p ? (
          <>
            <div className={styles.askWhat}>
              <span className={styles.kick}>What are we talking about?</span>
            </div>
            <div className={`${styles.doors} ${styles.doorsBig}`}>
              {PRODUCTS.map((x) => (
                <button
                  type="button"
                  key={x.id}
                  className={styles.door}
                  onClick={() => openProduct(x.id)}
                >
                  <span className={styles.dn}>{x.name}</span>
                  <span className={styles.dl}>{x.door}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.doors}>
              {PRODUCTS.map((x) => (
                <button
                  type="button"
                  key={x.id}
                  className={`${styles.door} ${x.id === productId ? styles.doorOn : ""}`}
                  onClick={() => openProduct(x.id)}
                >
                  <span className={styles.dn}>{x.name}</span>
                </button>
              ))}
            </div>
            <ProductPanel p={p} />
          </>
        )}
      </div>

      <aside className={styles.right}>
        <div className={styles.rpBody}>
          {!p ? (
            <div className={styles.rpEmpty}>
              Pick the product. What they say about it lands here.
            </div>
          ) : (
            <>
              <div className={`${styles.kick} ${styles.rpK}`}>When they say</div>
              {cuesFor(p.id).map((c) => (
                <CueRow
                  key={c.id}
                  c={c}
                  open={openCue === c.id}
                  onOpen={() => takeCue(c.id)}
                  onGo={openProduct}
                />
              ))}
            </>
          )}
        </div>
        <BetweenFoot open={openBetween} onOpen={setOpenBetween} full={!p} />
      </aside>
    </div>
  );
}
