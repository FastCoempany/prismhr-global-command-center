"use client";

// The F26 face's pieces (ship order 2026-11-04; docs/mockups/
// homeroom-f-decks-2026-11-04.html): the map of the countries in the live
// deals, each deal said as one sentence whose parts are controls, the bar of
// tools at the account's name, and the people in the deal as a fanned deck
// with the contact card of the person up front beside it. The row in
// room-client.tsx holds the state and the record's actions; these hold the
// face.

import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDismiss } from "@/components/use-dismiss";
import { COUNTRY_NAME } from "@/lib/intel/lexicon";
import { landPath, MAP, mapXY } from "@/lib/room/world-map";
import {
  dateTone,
  daysTo,
  inCountry,
  type DeckPerson,
  type MapCountry,
  type RowFacts,
  type Touch,
} from "@/lib/room/facts";
import { setRowFact, type FactChange } from "./facts-actions";
import f from "./f.module.css";

const LAND = landPath();
const flagUrl = (code: string) => `https://flagcdn.com/w40/${code}.png`;

export function Flag({ code, w = 22 }: { code: string; w?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={f.flag}
      src={flagUrl(code)}
      alt=""
      width={w}
      height={Math.round((w * 2) / 3)}
      aria-hidden="true"
    />
  );
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const monDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
const daysWord = (n: number) =>
  n < 0
    ? `${-n} ${plural(-n, "day", "days")} ago`
    : n === 0
      ? "today"
      : `${n} ${plural(n, "day", "days")}`;

/** "a, b and c" */
function andList(parts: ReactNode[]): ReactNode {
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && (i === parts.length - 1 ? " and " : ", ")}
      {p}
    </Fragment>
  ));
}

/** Where a fact came from, as the hover says it. */
function tipOf(x: { day: string; line: string }, hand?: boolean): string {
  if (hand)
    return `Set by you${x.day ? ` ${x.day}` : ""}. ↺ under the sentence puts back what the record says.`;
  return x.line
    ? `From the record${x.day ? ` · ${x.day}` : ""}: ${x.line}`
    : "From the record.";
}

// ── the map ────────────────────────────────────────────────────────────────
export function RoomMap({
  countries,
  selected,
  onPick,
  pulse,
}: {
  countries: MapCountry[];
  selected: string | null;
  onPick: (code: string | null) => void;
  /** The one country whose light pulses: the nearest red date. */
  pulse: string | null;
}) {
  if (!countries.length) return null;
  const toneWord = (c: MapCountry) =>
    c.days != null
      ? daysWord(c.days).toUpperCase()
      : c.tone === "warm"
        ? "ASAP"
        : "NO DATE";
  const peopleLine = (c: MapCountry) => {
    const parts: string[] = [];
    if (c.people) parts.push(`${c.people} ${plural(c.people, "PERSON", "PEOPLE")}`);
    if (c.unsaid)
      parts.push(
        parts.length
          ? c.unsaid === 1
            ? "ONE DEAL'S COUNT NOT SAID"
            : `${c.unsaid} DEALS' COUNTS NOT SAID`
          : "COUNT NOT SAID",
      );
    return parts.join(" · ");
  };
  return (
    <section className={f.map} aria-label="Countries in your deals">
      <div className={f.mapL}>
        <div className={f.k}>Countries in your deals</div>
        <div className={f.mapBox}>
          <svg
            className={f.dots}
            viewBox={`0 0 ${MAP.cols} ${MAP.rows}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={LAND} fill="rgba(10,28,64,.15)" />
          </svg>
          {countries.map((c) => {
            const xy = mapXY(c.code);
            if (!xy) return null;
            const sel = selected === c.code;
            return (
              <Fragment key={c.code}>
                <span
                  className={`${f.pinDot} ${f[`t_${c.tone}`]} ${pulse === c.code ? f.pulse : ""}`}
                  style={{ left: `${xy[0]}%`, top: `${xy[1]}%` }}
                />
                <button
                  type="button"
                  className={`${f.pin} ${f[`t_${c.tone}`]} ${sel ? f.pinSel : ""} ${selected && !sel ? f.pinDim : ""}`}
                  style={{ left: `${xy[0]}%`, top: `${xy[1]}%` }}
                  aria-pressed={sel}
                  title={`${COUNTRY_NAME[c.code]}: ${c.deals.map((d) => d.name).join(", ")}`}
                  onClick={() => onPick(sel ? null : c.code)}
                >
                  <Flag code={c.code} w={16} />
                  {COUNTRY_NAME[c.code] ?? c.code.toUpperCase()}
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>
      <div className={f.mapR}>
        <div className={f.k}>
          {selected
            ? `Showing the deals in ${COUNTRY_NAME[selected] ?? selected}`
            : "Click a country to show its deals"}
        </div>
        {countries.map((c) => (
          <button
            key={c.code}
            type="button"
            className={`${f.crow} ${selected === c.code ? f.crowSel : ""}`}
            aria-pressed={selected === c.code}
            onClick={() => onPick(selected === c.code ? null : c.code)}
          >
            <Flag code={c.code} w={28} />
            <span className={f.crowMid}>
              <span className={f.cn}>{COUNTRY_NAME[c.code] ?? c.code.toUpperCase()}</span>
              <span className={f.cs}>{peopleLine(c)}</span>
              <span className={f.cs}>{c.deals.map((d) => d.name).join(" · ")}</span>
            </span>
            <span className={f.cw}>
              <span className={`${f.light} ${f[`t_${c.tone}`]}`} /> {toneWord(c)}
            </span>
          </button>
        ))}
        {selected && (
          <button type="button" className={f.showAll} onClick={() => onPick(null)}>
            Show every deal
          </button>
        )}
      </div>
    </section>
  );
}

// ── the sentence ───────────────────────────────────────────────────────────
type SentenceProps = {
  accountId: string;
  name: string;
  sfUrl: string | null;
  facts: RowFacts;
  todayIso: string;
  canWrite: boolean;
  collapsed: boolean;
  onToggle: () => void;
  /** The tools that ride on hover at the account's name. */
  tools: ReactNode;
  /** The stamp beside the name once a deal is closed. */
  stamp: ReactNode;
};

const SF_LOGO = (
  <svg viewBox="0 0 40 28" aria-hidden="true" className={f.sfLogo}>
    <path
      d="M10.5 25h20.5a7.6 7.6 0 0 0 .9-15.2A9.6 9.6 0 0 0 13.7 7.2 7.2 7.2 0 0 0 10.5 25z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <text
      x="20.6"
      y="19.6"
      textAnchor="middle"
      fontFamily="Public Sans,Arial,sans-serif"
      fontWeight="700"
      fontSize="9.6"
      fill="currentColor"
    >
      SF
    </text>
  </svg>
);

export function Sentence(p: SentenceProps) {
  const router = useRouter();
  const [menu, setMenu] = useState<null | "chair" | "client" | { country: string }>(null);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const menuRef = useDismiss<HTMLDivElement>(menu !== null, () => setMenu(null));
  const lineRef = useRef<HTMLParagraphElement | null>(null);

  // One line, whole (ship order 2026-11-04, F10): the type steps down until
  // the sentence fits its line; at the floor it wraps rather than cut.
  useLayoutEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const fit = () => {
      if (menu !== null) return;
      el.style.whiteSpace = "nowrap";
      let size = 19;
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > el.clientWidth + 1 && size > 12) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
      if (el.scrollWidth > el.clientWidth + 1) el.style.whiteSpace = "normal";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [p.facts, p.name, menu]);

  const change = (c: FactChange) => {
    setPending(true);
    void setRowFact(p.accountId, c).then((r) => {
      setPending(false);
      setMenu(null);
      if (r.ok) router.refresh();
    });
  };

  const { facts } = p;
  const write = p.canWrite && !!p.accountId;
  const chairWord =
    facts.chair.v === "resale"
      ? "would resell"
      : facts.chair.v === "referral"
        ? "would refer"
        : "Reseller or referral not said yet";
  const chairTok = (
    <span className={f.tokWrap}>
      <button
        type="button"
        className={`${f.tok} ${f.chairTok} ${facts.chair.v === "none" ? f.unsaid : ""} ${facts.chair.hand ? f.hand : ""}`}
        title={
          facts.chair.v === "none"
            ? "The record has not said. Click to set it."
            : tipOf(facts.chair, facts.chair.hand)
        }
        aria-haspopup={write ? "menu" : undefined}
        aria-expanded={menu === "chair"}
        disabled={!write}
        onClick={() => setMenu(menu === "chair" ? null : "chair")}
      >
        {chairWord}
        {write ? " ▾" : ""}
      </button>
      {menu === "chair" && (
        <span className={f.menu} role="menu">
          {(
            [
              ["resale", "Resell it"],
              ["referral", "Refer it"],
              ["none", "Not said yet"],
            ] as const
          ).map(([v, t]) => (
            <button
              key={v}
              type="button"
              role="menuitemradio"
              aria-checked={facts.chair.v === v}
              disabled={pending}
              onClick={() => change({ field: "chair", value: v })}
            >
              {t}
            </button>
          ))}
        </span>
      )}
    </span>
  );

  const prods = facts.products.length ? (
    andList(
      facts.products.map((x) => (
        <span key={x.key} className={`${f.tok} ${f.prodTok}`} title={tipOf(x)}>
          {x.word}
        </span>
      )),
    )
  ) : (
    <span className={`${f.tok} ${f.unsaid}`} title="The record names no product yet.">
      nothing named yet
    </span>
  );

  const clientTok =
    menu === "client" ? (
      <input
        className={f.nameIn}
        autoFocus
        value={draft}
        disabled={pending}
        placeholder="Type the client's name, then Enter"
        aria-label="The client's name"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim())
            change({ field: "client", value: draft });
          if (e.key === "Escape") setMenu(null);
        }}
      />
    ) : facts.client.name ? (
      <span
        className={`${f.tok} ${f.clientTok} ${f.hand}`}
        title={tipOf({ day: facts.client.day, line: "" }, true)}
      >
        {facts.client.name}
      </span>
    ) : (
      <button
        type="button"
        className={`${f.tok} ${f.unsaid}`}
        disabled={!write}
        title="The record has not named the client. Click to name it."
        onClick={() => {
          setDraft("");
          setMenu("client");
        }}
      >
        a client not named yet{write ? " ▾" : ""}
      </button>
    );

  const countryMenu = (code: string) => {
    if (typeof menu !== "object" || menu === null || menu.country !== code) return null;
    const have = new Set(facts.countries.map((c) => c.code));
    const add = Object.keys(COUNTRY_NAME).filter((c) => !have.has(c));
    return (
      <span className={`${f.menu} ${f.cMenu}`} role="menu">
        {code && (
          <button
            type="button"
            role="menuitem"
            className={f.rm}
            disabled={pending}
            onClick={() => change({ field: "remove", code })}
          >
            ✕ Remove {COUNTRY_NAME[code]}
          </button>
        )}
        <span className={f.mk}>Add a country</span>
        {add.map((c) => (
          <button
            key={c}
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={() => change({ field: "add", code: c })}
          >
            <Flag code={c} w={18} />
            {COUNTRY_NAME[c]}
          </button>
        ))}
      </span>
    );
  };

  const ctryTok = (c: RowFacts["countries"][number]) => (
    <span className={f.tokWrap}>
      <button
        type="button"
        className={`${f.tok} ${f.ctryTok} ${c.hand ? f.hand : ""}`}
        title={`${tipOf(c, c.hand)}${write ? " Click to add or remove a country." : ""}`}
        aria-haspopup={write ? "menu" : undefined}
        disabled={!write}
        onClick={() =>
          setMenu(
            typeof menu === "object" && menu?.country === c.code
              ? null
              : { country: c.code },
          )
        }
      >
        <Flag code={c.code} w={20} />
        {c.name}
      </button>
      {countryMenu(c.code)}
    </span>
  );

  const loose = facts.heads.filter(
    (h) => !h.country || !facts.countries.some((c) => c.code === h.country),
  );
  const where = facts.countries.length ? (
    andList(
      facts.countries.map((c) => {
        const hs = facts.heads.filter((h) => h.country === c.code);
        if (!hs.length)
          return (
            <Fragment key={c.code}>
              {ctryTok(c)}, <span className={`${f.tok} ${f.quiet}`}>count not said</span>
            </Fragment>
          );
        const n = hs.reduce((s, h) => s + h.n, 0);
        return (
          <Fragment key={c.code}>
            <span className={`${f.tok} ${f.numTok}`} title={tipOf(hs[0]!)}>
              {n}
            </span>{" "}
            {plural(n, "person", "people")} in{" "}
            {inCountry(c.code).startsWith("the ") ? "the " : ""}
            {ctryTok(c)}
          </Fragment>
        );
      }),
    )
  ) : (
    <span className={f.tokWrap}>
      <button
        type="button"
        className={`${f.tok} ${f.quiet}`}
        disabled={!write}
        title="The record names no country yet. Click to add one."
        onClick={() =>
          setMenu(
            typeof menu === "object" && menu?.country === "" ? null : { country: "" },
          )
        }
      >
        no country said yet{write ? " ▾" : ""}
      </button>
      {countryMenu("")}
    </span>
  );
  const looseN = loose.reduce((s, h) => s + h.n, 0);

  const tone = dateTone(facts.date, p.todayIso);
  const date = !facts.date ? (
    <span className={`${f.tok} ${f.quiet}`}>no date said</span>
  ) : facts.date.iso ? (
    <>
      by{" "}
      <span
        className={`${f.tok} ${f.dateTok} ${f[`t_${tone}`]}`}
        title={tipOf(facts.date)}
      >
        {monDay(facts.date.iso)} · {daysWord(daysTo(facts.date.iso, p.todayIso))}
      </span>
    </>
  ) : (
    <span className={`${f.tok} ${f.dateTok} ${f.t_warm}`} title={tipOf(facts.date)}>
      as soon as they can
    </span>
  );

  const nameLink = (
    <span className={f.nameWrap}>
      <Link href={`/accounts?focus=${p.accountId}`} className={f.nmLink}>
        {p.name}
      </Link>
      {p.sfUrl && (
        <a
          className={f.sfMini}
          href={p.sfUrl}
          target="_blank"
          rel="noreferrer"
          title={`Open ${p.name} in Salesforce`}
          aria-label={`Open ${p.name} in Salesforce`}
        >
          {SF_LOGO}
        </a>
      )}
      {p.stamp}
    </span>
  );

  const rest = (
    <>
      {where}
      {looseN > 0 && (
        <>
          {facts.countries.length ? ", plus " : ", "}
          <span className={`${f.tok} ${f.numTok}`} title={tipOf(loose[0]!)}>
            {looseN}
          </span>{" "}
          {plural(looseN, "person", "people")} with no country said
        </>
      )}
      , {date}.
    </>
  );
  const body =
    facts.chair.v === "resale" ? (
      <>
        {nameLink} {chairTok} {prods} to {clientTok}: {rest}
      </>
    ) : facts.chair.v === "referral" ? (
      <>
        {nameLink} {chairTok} {clientTok} to us for {prods}: {rest}
      </>
    ) : (
      <>
        {nameLink} wants {prods} for {clientTok}: {rest} {chairTok}
      </>
    );

  return (
    <div
      className={f.fline}
      ref={menuRef}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,input,[role=menu]")) return;
        p.onToggle();
      }}
    >
      <button
        type="button"
        className={f.caret}
        aria-expanded={!p.collapsed}
        title={p.collapsed ? "Open this deal" : "Collapse this deal"}
        onClick={p.onToggle}
      >
        {p.collapsed ? "▸" : "▾"}
      </button>
      {p.tools && <span className={f.nmTools}>{p.tools}</span>}
      <p ref={lineRef} className={`${f.fsent} ${menu !== null ? f.lift : ""}`}>
        {body}
      </p>
    </div>
  );
}

/** What the operator set by hand on the sentence, each with its ↺. */
export function HandLine({
  accountId,
  facts,
  canWrite,
}: {
  accountId: string;
  facts: RowFacts;
  canWrite: boolean;
}) {
  const router = useRouter();
  const back = (c: FactChange) =>
    void setRowFact(accountId, c).then((r) => r.ok && router.refresh());
  const marks: ReactNode[] = [];
  const btn = (c: FactChange) =>
    canWrite ? (
      <button
        type="button"
        title="Put back what the record says"
        aria-label="Put back what the record says"
        onClick={() => back(c)}
      >
        ↺
      </button>
    ) : null;
  if (facts.chair.hand)
    marks.push(
      <span key="chair" className={f.handMark}>
        RESELLER OR REFERRAL SET BY YOU · {facts.chair.day}
        {btn({ field: "chair", value: null })}
      </span>,
    );
  if (facts.client.hand)
    marks.push(
      <span key="client" className={f.handMark}>
        CLIENT NAMED BY YOU · {facts.client.day}
        {btn({ field: "client", value: null })}
      </span>,
    );
  const added = facts.countries.filter((c) => c.hand);
  if (added.length)
    marks.push(
      <span key="add" className={f.handMark}>
        {added.map((c) => c.name.toUpperCase()).join(", ")} ADDED BY YOU · {added[0]!.day}
        {btn({ field: "unadd" })}
      </span>,
    );
  if (facts.removed.length)
    marks.push(
      <span key="rm" className={f.handMark}>
        {facts.removed.map((c) => (COUNTRY_NAME[c] ?? c).toUpperCase()).join(", ")}{" "}
        REMOVED BY YOU
        {btn({ field: "unremove" })}
      </span>,
    );
  return marks.length ? <div className={f.handLine}>{marks}</div> : null;
}

// ── the people in the deal ─────────────────────────────────────────────────
const nowIso = () => new Date().toISOString();
function quietOf(p: DeckPerson, now: string) {
  const heard = p.touches.filter((t) => t.dir !== "out");
  const last = heard[heard.length - 1];
  if (!last) return { tone: "cold" as const, word: "Never wrote back", ins: 0 };
  const n = Math.max(0, Math.round((Date.parse(now) - Date.parse(last.at)) / 86_400_000));
  return {
    tone: n <= 14 ? ("ok" as const) : n <= 45 ? ("warn" as const) : ("cold" as const),
    word:
      n <= 14
        ? n === 0
          ? "Wrote today"
          : `Wrote ${n} ${plural(n, "day", "days")} ago`
        : `Quiet ${n} days`,
    ins: heard.length,
  };
}
const inits = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
const touchWord = (t: Touch) => {
  const d = new Date(t.at).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });
  const k = t.kind === "email" ? "Email" : t.kind === "call" ? "Call" : "Meeting";
  return `${k}${t.dir === "in" ? " from them" : t.dir === "out" ? " from you" : ""} · ${d}`;
};
const touchGlyph = (t: Touch) =>
  t.kind === "email" ? (t.dir === "out" ? "➤" : "✉") : t.kind === "call" ? "☎" : "◷";

const LI = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" />
    <path
      d="M7 10v7M7 7v.01M11 17v-7M11 13.5c0-2 1.2-3.5 3-3.5s3 1.2 3 3.5V17"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export function PeopleDeck({
  deck,
  tone,
  accountName,
}: {
  deck: DeckPerson[];
  /** MULTI's tone, the semantic ladder (red 1 / amber 2 / green 3+). */
  tone: "g" | "y" | "r";
  accountName: string;
}) {
  const [at, setAt] = useState(0);
  const [rollOpen, setRollOpen] = useState(false);
  const now = nowIso();
  if (!deck.length)
    return (
      <div className={f.ppl}>
        <div className={f.ph}>
          <span className={f.phk}>People in the deal</span>
        </div>
        <p className={f.nil}>Nobody from {accountName} is on the record yet.</p>
      </div>
    );
  const front = deck[at % deck.length]!;
  const order = deck.map((_, k) => deck[(at + k) % deck.length]!);
  const info = quietOf(front, now);
  const row = (lbl: string, v: string, href?: string) => (
    <div className={f.cir}>
      <span className={f.cil}>{lbl}</span>
      {v ? (
        href ? (
          <a href={href}>{v}</a>
        ) : (
          <span>{v}</span>
        )
      ) : (
        <span className={f.nf}>Not on file yet</span>
      )}
    </div>
  );
  return (
    <div className={f.ppl}>
      <div className={f.ph}>
        <span className={f.phk}>People in the deal</span>
        {/* MULTI and the count are a door (the click-depth law): one click
            lists everyone in the deal with how often each side wrote. */}
        <button
          type="button"
          className={f.multiDoor}
          aria-expanded={rollOpen}
          title="Everyone in the deal, and how often each side wrote"
          onClick={() => setRollOpen((v) => !v)}
        >
          <span
            className={`${f.multi} ${f[`m_${tone}`]}`}
            title="How many of their people write back"
          >
            MULTI
          </span>
          <span className={f.phs}>
            {deck.length} on the record {rollOpen ? "▾" : "▸"}
          </span>
        </button>
      </div>
      {rollOpen && (
        <ul className={f.roll}>
          {deck.map((p) => {
            const q = quietOf(p, now);
            const outs = p.touches.filter((t) => t.dir !== "in").length;
            return (
              <li key={p.name}>
                <b>{p.name}</b>
                {p.title ? ` · ${p.title}` : ""} · {q.ins} from them · {outs} from you
              </li>
            );
          })}
        </ul>
      )}
      <div className={f.deck}>
        <div className={f.dleft}>
          <div
            className={f.dstack}
            style={{ width: `${230 + (deck.length - 1) * 56}px` }}
          >
            {order
              .map((p, k) => {
                const q = quietOf(p, now);
                return (
                  <button
                    key={p.name}
                    type="button"
                    className={`${f.dcard} ${k === 0 ? f.front : ""}`}
                    style={{
                      transform: `translateX(${k * 56}px) translateY(${k * 5}px) rotate(${k * 3.5}deg) scale(${(1 - k * 0.05).toFixed(2)})`,
                      zIndex: 10 - k,
                    }}
                    aria-current={k === 0 ? "true" : undefined}
                    aria-label={k === 0 ? undefined : `Bring ${p.name} to the front`}
                    tabIndex={k === 0 ? 0 : -1}
                    onClick={() => setAt((at + k) % deck.length)}
                  >
                    <span className={f.cardBody}>
                      <span className={`${f.mono} ${f[`q_${q.tone}`]}`}>
                        {inits(p.name)}
                      </span>
                      <span className={f.sn}>{p.name}</span>
                      <span className={f.sr}>{p.title || "Title not on file yet"}</span>
                      <span className={`${f.sq} ${f[`q_${q.tone}`]}`}>{q.word}</span>
                    </span>
                    {k > 0 && (
                      <span className={f.ptab}>
                        <span className={`${f.pm} ${f[`q_${q.tone}`]}`}>
                          {inits(p.name)}
                        </span>
                        <span className={f.pf}>{p.name.split(" ")[0]}</span>
                      </span>
                    )}
                  </button>
                );
              })
              .reverse()}
          </div>
          {deck.length > 1 && (
            <div className={f.dnav}>
              <button
                type="button"
                aria-label="Previous person"
                onClick={() => setAt((at - 1 + deck.length) % deck.length)}
              >
                ‹
              </button>
              <span>
                {(at % deck.length) + 1} of {deck.length}
              </span>
              <button
                type="button"
                aria-label="Next person"
                onClick={() => setAt((at + 1) % deck.length)}
              >
                ›
              </button>
            </div>
          )}
        </div>
        <div className={f.dright}>
          <div className={f.pdh}>
            <b>{front.name}</b>
            {front.linkedin ? (
              <a
                className={f.li}
                href={front.linkedin}
                target="_blank"
                rel="noreferrer"
                title={`${front.name} on LinkedIn`}
                aria-label={`${front.name} on LinkedIn`}
              >
                {LI}
              </a>
            ) : (
              <span
                className={`${f.li} ${f.liNone}`}
                title={`No LinkedIn on file for ${front.name}`}
                aria-label="No LinkedIn on file"
              >
                {LI}
                <i />
              </span>
            )}
          </div>
          <div className={`${f.pti} ${front.title ? "" : f.nf}`}>
            {front.title || "Title not on file yet"}
          </div>
          <div className={`${f.sq} ${f[`q_${info.tone}`]}`}>{info.word}</div>
          <div className={f.cis}>
            {row("Email", front.email, front.email ? `mailto:${front.email}` : undefined)}
            {row(
              "Office",
              front.phone,
              front.phone ? `tel:${front.phone.replace(/[^\d+]/g, "")}` : undefined,
            )}
            {front.mobile &&
              row("Mobile", front.mobile, `tel:${front.mobile.replace(/[^\d+]/g, "")}`)}
            {row("Location", front.city)}
          </div>
          <div className={f.cil}>Every exchange</div>
          {front.touches.length ? (
            <ol className={f.pdl}>
              {front.touches
                .slice()
                .reverse()
                .map((t, i) => (
                  <li key={i}>
                    <span className={f.g}>{touchGlyph(t)}</span>
                    {touchWord(t)}
                  </li>
                ))}
            </ol>
          ) : (
            <p className={f.nil}>
              No exchange with {front.name.split(" ")[0]} is on the record yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
