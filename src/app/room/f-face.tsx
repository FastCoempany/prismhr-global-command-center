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
  headWord,
  inCountry,
  type DeckPerson,
  type MapCountry,
  type RowFacts,
  type Touch,
} from "@/lib/room/facts";
import {
  CLIENT_STAGES,
  PARTNER_STAGES,
  stageTone,
  type ClientKey,
  type Ladders,
  type PartnerKey,
  type StageSource,
} from "@/lib/room/ladders";
import { setRowFact, setRowPeople, type FactChange } from "./facts-actions";
import type { PeopleChange } from "@/lib/room/people-store";
import { recordFilesSent, takeBackFilesSent } from "./files-actions";
import type { FilesSent } from "@/lib/room/files-sent";
import {
  ATTACHMENTS,
  ATTACH_GROUPS,
  attachmentById,
  sizeLabel,
} from "@/lib/collateral/attachments";
import { downloadDraft, fetchAttachment } from "@/lib/collateral/draft-client";
import { draftWithFiles } from "@/lib/groundwork/eml";
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
}: {
  countries: MapCountry[];
  selected: string | null;
  onPick: (code: string | null) => void;
}) {
  if (!countries.length) return null;
  // A passed date says so with its day; it never reads as urgency.
  const toneWord = (c: MapCountry) =>
    c.tone === "past" && c.iso
      ? `PASSED ${monDay(c.iso).toUpperCase()}`
      : c.days != null
        ? daysWord(c.days).toUpperCase()
        : c.tone === "warm"
          ? "ASAP"
          : "NO DATE";
  const peopleLine = (c: MapCountry) => {
    const parts: string[] = [];
    if (c.people) parts.push(`${c.people} ${headWord(c.kinds, c.people).toUpperCase()}`);
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
            // One control per country: the dot sits exactly on the country's
            // point and pulses in its tone, always; its label rides above it.
            // Hovering or focusing either brings that pin, label and all, in
            // front of every other (founder, 2026-11-05).
            return (
              <button
                key={c.code}
                type="button"
                className={`${f.pinG} ${selected && !sel ? f.pinDim : ""}`}
                style={{ left: `${xy[0]}%`, top: `${xy[1]}%` }}
                aria-pressed={sel}
                aria-label={COUNTRY_NAME[c.code] ?? c.code.toUpperCase()}
                title={`${COUNTRY_NAME[c.code]}: ${c.deals.map((d) => d.name).join(", ")}`}
                onClick={() => onPick(sel ? null : c.code)}
              >
                <span className={`${f.pinDot} ${f[`d_${c.tone}`]}`} aria-hidden="true" />
                <span
                  className={`${f.pin} ${f[`p_${c.tone}`]} ${sel ? f.pinSel : ""}`}
                  aria-hidden="true"
                >
                  <Flag code={c.code} w={16} />
                  {COUNTRY_NAME[c.code] ?? c.code.toUpperCase()}
                </span>
              </button>
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
        {`${chairWord}${write ? " ▾" : ""}`}
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
    ) : facts.client.name && facts.client.hand ? (
      <span
        className={`${f.tok} ${f.clientTok} ${f.hand}`}
        title={tipOf({ day: facts.client.day, line: "" }, true)}
      >
        {facts.client.name}
      </span>
    ) : facts.client.name ? (
      // The read named it: a click corrects it by hand.
      <button
        type="button"
        className={`${f.tok} ${f.clientTok}`}
        disabled={!write}
        title={`${tipOf({ day: facts.client.day, line: facts.client.line ?? "" })}${write ? " Click to name it yourself." : ""}`}
        onClick={() => {
          setDraft(facts.client.name ?? "");
          setMenu("client");
        }}
      >
        {facts.client.name}
      </button>
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
        {`a client not named yet${write ? " ▾" : ""}`}
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
            {headWord(
              hs.map((h) => h.kind),
              n,
            )}{" "}
            in {inCountry(c.code).startsWith("the ") ? "the " : ""}
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
        {`no country said yet${write ? " ▾" : ""}`}
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
        {`${monDay(facts.date.iso)} · ${daysWord(daysTo(facts.date.iso, p.todayIso))}`}
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
          {headWord(
            loose.map((h) => h.kind),
            looseN,
          )}{" "}
          with no country said
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

/** Add a person to the deal by hand (release three): a name, then whatever
 *  else the operator has. Enter on any field adds them; Escape closes. */
function AddPerson({
  accountName,
  onAdd,
  pending,
}: {
  accountName: string;
  onAdd: (p: { name: string; title: string; email: string; phone: string }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState({ name: "", title: "", email: "", phone: "" });
  if (!open)
    return (
      <button
        type="button"
        className={f.addPerson}
        title={`Add someone from ${accountName} the record hasn't named yet`}
        onClick={() => setOpen(true)}
      >
        ＋ Add a person
      </button>
    );
  const submit = () => {
    if (!p.name.trim()) return;
    onAdd(p);
    setP({ name: "", title: "", email: "", phone: "" });
    setOpen(false);
  };
  const field = (k: keyof typeof p, label: string, auto = false) => (
    <input
      className={f.nameIn}
      autoFocus={auto}
      value={p[k]}
      disabled={pending}
      placeholder={label}
      aria-label={label}
      onChange={(e) => setP({ ...p, [k]: e.target.value })}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") setOpen(false);
      }}
    />
  );
  return (
    <div className={f.addForm}>
      {field("name", "Their name", true)}
      {field("title", "Their title")}
      {field("email", "Their email")}
      {field("phone", "Their phone")}
      <button
        type="button"
        className={f.addGo}
        disabled={pending || !p.name.trim()}
        onClick={submit}
      >
        Add them
      </button>
      <button type="button" className={f.addX} onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}

export function PeopleDeck({
  deck,
  tone,
  accountName,
  accountId = "",
  canWrite = false,
}: {
  deck: DeckPerson[];
  /** MULTI's tone, the semantic ladder (red 1 / amber 2 / green 3+). */
  tone: "g" | "y" | "r";
  accountName: string;
  accountId?: string;
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [at, setAt] = useState(0);
  const [rollOpen, setRollOpen] = useState(false);
  const [exOpen, setExOpen] = useState(false);
  const [liEdit, setLiEdit] = useState(false);
  const [liDraft, setLiDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const now = nowIso();
  const people = (c: PeopleChange, done?: () => void) => {
    setPending(true);
    void setRowPeople(accountId, c).then((r) => {
      setPending(false);
      if (r.ok) {
        setMsg(null);
        done?.();
        router.refresh();
      } else setMsg(r.reason ?? "That didn't save. Try again.");
    });
  };
  const adder =
    canWrite && accountId ? (
      <AddPerson
        accountName={accountName}
        pending={pending}
        onAdd={(person) => people({ kind: "add", person })}
      />
    ) : null;
  if (!deck.length)
    return (
      <div className={f.ppl}>
        <div className={f.ph}>
          <span className={f.phk}>People in the deal</span>
        </div>
        <p className={f.nil}>Nobody from {accountName} is on the record yet.</p>
        {adder}
        {msg && <p className={f.nil}>{msg}</p>}
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
            {`${deck.length} on the record ${rollOpen ? "▾" : "▸"}`}
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
                      {k > 0 && (
                        <span className={`${f.sq} ${f[`q_${q.tone}`]}`}>{q.word}</span>
                      )}
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
                title={`${front.name} on LinkedIn${front.liFrom === "salesnav" ? ", from a Sales Navigator alert" : ""}`}
                aria-label={`${front.name} on LinkedIn`}
              >
                {LI}
              </a>
            ) : canWrite && accountId ? (
              <button
                type="button"
                className={`${f.li} ${f.liNone} ${f.liBtn}`}
                title={`No LinkedIn on file for ${front.name}. Add their page.`}
                aria-label={`Add ${front.name}'s LinkedIn page`}
                onClick={() => {
                  setLiDraft("");
                  setLiEdit(true);
                }}
              >
                {LI}
                <i />
              </button>
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
            {canWrite && front.liFrom === "hand" && (
              <button
                type="button"
                className={f.liBack}
                title="Take back the LinkedIn page you set"
                aria-label="Take back the LinkedIn page you set"
                onClick={() => people({ kind: "linkedin", name: front.name, url: null })}
              >
                ↺
              </button>
            )}
            {canWrite && front.hand && (
              <span className={f.handMark}>
                ADDED BY YOU
                <button
                  type="button"
                  title={`Take ${front.name} off the deal`}
                  aria-label={`Take ${front.name} off the deal`}
                  onClick={() => {
                    setAt(0);
                    people({ kind: "remove", name: front.name });
                  }}
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          {liEdit && (
            <input
              className={f.nameIn}
              autoFocus
              value={liDraft}
              disabled={pending}
              placeholder={`Paste ${front.name.split(" ")[0]}'s LinkedIn page, then Enter`}
              aria-label={`${front.name}'s LinkedIn page`}
              onChange={(e) => setLiDraft(e.target.value)}
              onBlur={() => !liDraft.trim() && setLiEdit(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && liDraft.trim())
                  people({ kind: "linkedin", name: front.name, url: liDraft }, () =>
                    setLiEdit(false),
                  );
                if (e.key === "Escape") setLiEdit(false);
              }}
            />
          )}
          {msg && <p className={f.nil}>{msg}</p>}
          <div className={`${f.pti} ${front.title ? "" : f.nf}`}>
            {front.title || "Title not on file yet"}
          </div>
          {/* The quiet line is the door to every exchange it counts from
              (the click-depth law), one click deep. */}
          <button
            type="button"
            className={`${f.sq} ${f.quietDoor} ${f[`q_${info.tone}`]}`}
            aria-expanded={exOpen}
            title={`Every exchange with ${front.name.split(" ")[0]}`}
            onClick={() => setExOpen((v) => !v)}
          >
            {`${info.word} ${exOpen ? "▾" : "▸"}`}
          </button>
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
          {exOpen && <div className={f.cil}>Every exchange</div>}
          {!exOpen ? null : front.touches.length ? (
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
      {adder}
    </div>
  );
}

// ── the two stage ladders (release two) ────────────────────────────────────
// One band under the sentence: the partner on the left, named, with the
// agreement meter where the client side has its read; the client on the
// right. Each stage says where it came from; a click on a step sets it by
// hand, and ↺ puts back what the record shows.
const AGR_WORD = [
  "Not sent yet",
  "Sent at their request",
  "Their redline is back",
  "Signed",
];

function Track({
  which,
  cur,
  canWrite,
  onSet,
}: {
  which: "p" | "c";
  cur: number;
  canWrite: boolean;
  onSet: (k: string) => void;
}) {
  const steps = which === "p" ? PARTNER_STAGES : CLIENT_STAGES;
  const cols = { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` };
  return (
    <>
      <div className={f.lt} style={cols}>
        {steps.map((s, i) => {
          const derived = which === "p" && s.k === "live";
          return (
            <button
              key={s.k}
              type="button"
              className={`${f.lp} ${i < cur ? f[`${stageTone(which, s.k)}Done`] : i === cur ? f[`${stageTone(which, s.k)}Cur`] : ""}`}
              title={`${s.label}: ${s.def}${derived || !canWrite ? "" : " Click to set it by hand."}`}
              aria-label={`${s.label}${i === cur ? ", the stage now" : ""}`}
              disabled={derived || !canWrite}
              onClick={() => onSet(s.k)}
            />
          );
        })}
      </div>
    </>
  );
}

function StageHead({
  label,
  tone,
  source,
  onBack,
}: {
  label: string;
  tone: string;
  source: StageSource;
  onBack?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const where =
    source.kind === "hand"
      ? `Set by you${source.day ? ` ${source.day}` : ""}. ↺ puts back what the record shows.`
      : `${source.kind === "board" ? "From the board" : "From the record"}${source.day ? ` · ${source.day}` : ""}: ${source.line}`;
  // The stage is a door to the line it stands on (the click-depth law):
  // one click shows where it came from, and the arrival carries only the
  // stage's name.
  return (
    <>
      <button
        type="button"
        className={`${f.lstg} ${f[`c_${tone}`]}`}
        title={where}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {source.kind === "hand" && (
        <span className={`${f.lsrc} ${f.lsrcHand}`}>
          YOUR MARK{source.day ? ` · ${source.day}` : ""}
        </span>
      )}
      {open && <span className={f.lwhere}>{where}</span>}
      {onBack && (
        <button
          type="button"
          className={f.lback}
          title="Put back what the record shows"
          aria-label="Put back what the record shows"
          onClick={onBack}
        >
          ↺
        </button>
      )}
    </>
  );
}

const SURE_WORD = { sure: "SURE", likely: "LIKELY", unsure: "UNSURE" } as const;

export function LadderBand({
  accountId,
  accountName,
  clientName,
  clientRead,
  ladders,
  canWrite,
}: {
  accountId: string;
  accountName: string;
  clientName: string | null;
  /** How sure the record is of the client the read named (release three). */
  clientRead?: {
    sure: "sure" | "likely" | "unsure";
    seen: number;
    day: string;
    line: string;
  } | null;
  ladders: Ladders;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [sureOpen, setSureOpen] = useState(false);
  const write = canWrite && !!accountId;
  const set = (c: FactChange) =>
    void setRowFact(accountId, c).then((r) => r.ok && router.refresh());
  const p = ladders.partner;
  const pi = PARTNER_STAGES.findIndex((s) => s.k === p.k);
  const ps = PARTNER_STAGES[pi]!;
  const c = ladders.client;
  const a = ladders.agreement;
  const agrTone = ["", f.agR, f.agA, f.agG][a.n];
  const agrTip = `${a.src ? `${a.src.kind === "board" ? "From the board" : a.src.kind === "hand" ? "From your mark" : "From the record"}${a.src.day ? ` · ${a.src.day}` : ""}: ${a.src.line} ` : ""}Dot 1: sent at their request. Dot 2: their redline is back. Dot 3: signed.`;
  const waiting = !c && (p.k === "signed" || p.k === "oriented");
  return (
    <div className={f.lband}>
      <div className={f.lad}>
        <div className={f.lh}>
          <span className={f.k}>Partner</span>
          <span className={f.lwho}>{accountName}</span>
          <span className={f.agr} title={agrTip} tabIndex={0}>
            <span className={f.agd} aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <i key={i} className={i <= a.n ? agrTone : ""} />
              ))}
            </span>
            {AGR_WORD[a.n]}
          </span>
        </div>
        <div className={f.lh}>
          {ladders.passed ? (
            <span className={`${f.lstg} ${f.passed}`}>Passed</span>
          ) : (
            <StageHead
              label={ps.label}
              tone={stageTone("p", p.k)}
              source={p.src}
              onBack={
                p.hand && write ? () => set({ field: "partner", value: null }) : undefined
              }
            />
          )}
        </div>
        <Track
          which="p"
          cur={ladders.passed ? -1 : pi}
          canWrite={write}
          onSet={(k) => set({ field: "partner", value: k as PartnerKey })}
        />
      </div>
      <div className={f.lad}>
        <div className={f.lh}>
          <span className={f.k}>Client</span>
          <span className={f.lwho}>
            {clientName ?? (c ? "A client not named yet" : "")}
          </span>
          {clientName && clientRead && (
            <button
              type="button"
              className={`${f.sure} ${f[`sure_${clientRead.sure}`]}`}
              aria-expanded={sureOpen}
              title={
                clientRead.sure === "unsure"
                  ? "The newest line naming this client hedges."
                  : clientRead.seen > 1
                    ? `Named in ${clientRead.seen} entries on the record.`
                    : "Named once on the record."
              }
              onClick={() => setSureOpen((v) => !v)}
            >
              {SURE_WORD[clientRead.sure]}
            </button>
          )}
        </div>
        {sureOpen && clientRead && (
          <p className={f.sureLine}>
            {`From the record · ${clientRead.day}: ${clientRead.line || "The read named it."}`}
          </p>
        )}
        {c ? (
          <>
            <div className={f.lh}>
              <StageHead
                label={CLIENT_STAGES.find((s) => s.k === c.k)!.label}
                tone={stageTone("c", c.k)}
                source={c.src}
                onBack={
                  c.hand && write ? () => set({ field: "stage", value: null }) : undefined
                }
              />
            </div>
            <Track
              which="c"
              cur={CLIENT_STAGES.findIndex((s) => s.k === c.k)}
              canWrite={write}
              onSet={(k) => set({ field: "stage", value: k as ClientKey })}
            />
          </>
        ) : (
          <>
            <span className={waiting ? f.lwait : f.lnone}>
              {waiting
                ? "No client named yet. Signed and waiting on a first one."
                : "No client mentioned yet."}
            </span>
            {write && (
              <button
                type="button"
                className={f.lstart}
                title="Mark a client as named by hand"
                onClick={() => set({ field: "stage", value: "named" })}
              >
                Start the client ladder
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── the files Send carries, from the row (release three) ──────────────────
// "Send files" opens a short form under the move row: who it goes to (the
// deck's people with an email on file), a subject, a line to go with the
// files, and the catalog's files ticked by group. "Download the draft"
// builds an Outlook draft in the browser that carries them, and records the
// send once the draft is in hand. A file that fails to load records nothing.
// "N Sent" opens every send on file, each with ↺.

export function SendFiles({
  accountId,
  deck,
  onClose,
}: {
  accountId: string;
  deck: DeckPerson[];
  onClose: () => void;
}) {
  const router = useRouter();
  const mailable = deck.filter((p) => /\S+@\S+\.\S+/.test(p.email));
  const [who, setWho] = useState(mailable[0]?.email ?? "");
  const [typed, setTyped] = useState("");
  const [subject, setSubject] = useState("PrismHR Global files");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const to = mailable.length
    ? (mailable.find((p) => p.email === who) ?? mailable[0]!)
    : { name: "", email: typed.trim() };
  const toggle = (id: string) =>
    setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const go = async () => {
    if (busy || !picked.length) return;
    setBusy(true);
    setNote(
      picked.length === 1
        ? "Packing the file into the draft."
        : `Packing ${picked.length} files into the draft.`,
    );
    try {
      const files = await Promise.all(picked.map(fetchAttachment));
      downloadDraft(
        draftWithFiles({
          to: { name: to.name, email: to.email },
          subject,
          body,
          files,
          stamp: new Date(),
        }),
        to.name || to.email,
      );
    } catch {
      setNote("A file didn't load. Nothing was recorded. Try again.");
      setBusy(false);
      return;
    }
    const r = await recordFilesSent(accountId, picked, to.name || to.email).catch(() => ({
      ok: false,
    }));
    setBusy(false);
    setNote(
      r.ok
        ? "Downloaded. Open it and Outlook shows the draft."
        : "Downloaded, but the send didn't record. Open it to send.",
    );
    setPicked([]);
    router.refresh();
  };
  return (
    <div className={f.sendFiles}>
      <div className={f.sfRow}>
        <span className={f.cil}>To</span>
        {mailable.length ? (
          <select
            className={f.nameIn}
            value={who}
            aria-label="Who the files go to"
            onChange={(e) => setWho(e.target.value)}
          >
            {mailable.map((p) => (
              <option key={p.email} value={p.email}>
                {p.name} · {p.email}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={f.nameIn}
            value={typed}
            placeholder="No email on file. Type one."
            aria-label="Who the files go to"
            onChange={(e) => setTyped(e.target.value)}
          />
        )}
      </div>
      <div className={f.sfRow}>
        <span className={f.cil}>Subject</span>
        <input
          className={f.nameIn}
          value={subject}
          aria-label="Subject"
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <textarea
        className={f.sfBody}
        value={body}
        rows={3}
        placeholder="Write a line to go with the files."
        aria-label="A line to go with the files"
        onChange={(e) => setBody(e.target.value)}
      />
      {ATTACH_GROUPS.map(({ group, kicker }) => (
        <fieldset key={group} className={f.sfGroup}>
          <legend className={f.cil}>{kicker}</legend>
          {ATTACHMENTS.filter((a) => a.group === group).map((a) => (
            <label key={a.id} className={f.sfItem}>
              <input
                type="checkbox"
                checked={picked.includes(a.id)}
                onChange={() => toggle(a.id)}
              />
              <span>{a.label}</span>
              <span className={f.nf}>
                {[a.runs, sizeLabel(a.bytes)].filter(Boolean).join(" · ")}
              </span>
            </label>
          ))}
        </fieldset>
      ))}
      <div className={f.sfFoot}>
        <button
          type="button"
          className={f.addGo}
          disabled={busy || !picked.length || !/\S+@\S+\.\S+/.test(to.email)}
          onClick={() => void go()}
        >
          Download the draft
        </button>
        <button type="button" className={f.addX} onClick={onClose}>
          Close
        </button>
        {note && (
          <span className={f.nil} role="status">
            {note}
          </span>
        )}
      </div>
    </div>
  );
}

export function SentList({
  accountId,
  sent,
  canWrite,
}: {
  accountId: string;
  sent: FilesSent[];
  canWrite: boolean;
}) {
  const router = useRouter();
  if (!sent.length) return null;
  return (
    <ol className={f.sentList}>
      {sent.map((s) => (
        <li key={s.id}>
          <span className={f.cil}>{mdOf(s.at)}</span>
          <span>
            {s.to ? `To ${s.to}: ` : ""}
            {s.files.map((id) => attachmentById(id)?.label ?? id).join(", ")}
          </span>
          {canWrite && (
            <button
              type="button"
              className={f.liBack}
              title="Take back this record of the send"
              aria-label="Take back this record of the send"
              onClick={() =>
                void takeBackFilesSent(accountId, s.id).then(
                  (r) => r.ok && router.refresh(),
                )
              }
            >
              ↺
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

const mdOf = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });
