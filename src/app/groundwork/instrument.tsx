"use client";

// The Klaxon — the time instrument that runs the room (triptych winner,
// decided 2026-08-11). The band's command and its countdown are the masthead:
// serif verb left, burning count right, a full-width burn bar draining as the
// window empties. Inside the last five minutes the count turns red and
// throbs. The capsule facts (Chicago clock, date, weather) ride the sub-row.
// Hydration-safe: em-dashes on the server, real readings after mount. Weather
// is a keyless open-meteo read; if the fetch fails the slot stays quiet — the
// room never invents a sky.

import { useEffect, useState } from "react";
import { BAND_TABLE } from "@/lib/groundwork/bands";
import styles from "./groundwork.module.css";

const CHICAGO = { latitude: 41.8781, longitude: -87.6298 };

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
const hm = (min: number) => `${Math.floor(min / 60)}:${pad(min % 60)}`;

// The working day's bands. The times are the one band table in day.ts
// (ruled 2026-09-25, D26); only the words live here.
const WORDS = [
  { label: "THE SEND WINDOW", verb: "Send." },
  { label: "THE PEOPLE WINDOW", verb: "Get on the phone." },
  { label: "RESEARCH & FILING", verb: "Research and file." },
] as const;
const BANDS = BAND_TABLE.map((b, i) => {
  const after = BAND_TABLE[i + 1];
  return {
    from: b.from,
    to: b.to,
    label: WORDS[i]?.label ?? "",
    verb: WORDS[i]?.verb ?? "",
    next: after
      ? `NEXT · ${WORDS[i + 1]?.label ?? ""} · ${hm(after.from)}–${hm(after.to)}`
      : `NEXT · TOMORROW'S SENDS · ${hm(BAND_TABLE[0].from)}`,
  };
});
const DAY_FROM = BANDS[0].from;
const DAY_TO = BANDS[BANDS.length - 1].to;

// Open-meteo WMO weather codes, folded to one plain word.
function skyWord(code: number): string {
  if (code === 0) return "clear";
  if (code <= 2) return "fair";
  if (code === 3) return "overcast";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "showers";
  if (code <= 86) return "snow";
  return "storms";
}

export function Instrument() {
  const [now, setNow] = useState<Date | null>(null);
  const [wx, setWx] = useState<string>("");

  useEffect(() => {
    const update = () => setNow(new Date());
    const first = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let dead = false;
    const read = async () => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${CHICAGO.latitude}&longitude=${CHICAGO.longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`,
        );
        const j = (await r.json()) as {
          current?: { temperature_2m?: number; weather_code?: number };
        };
        const t = j.current?.temperature_2m;
        const c = j.current?.weather_code;
        if (!dead && typeof t === "number" && typeof c === "number")
          setWx(`${Math.round(t)}° ${skyWord(c)}`);
      } catch {
        // quiet slot — never a fake reading
      }
    };
    read();
    const id = setInterval(read, 30 * 60 * 1000);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, []);

  // Chicago wall-clock minutes, derived once per tick.
  const chi = now
    ? new Date(
        now.toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }),
      )
    : null;
  const min = chi ? chi.getHours() * 60 + chi.getMinutes() + chi.getSeconds() / 60 : null;
  const sec = chi ? chi.getSeconds() : 0;

  const band =
    min == null ? BANDS[0] : (BANDS.find((b) => min < b.to) ?? BANDS[BANDS.length - 1]);
  const afterDay = min != null && min >= DAY_TO;
  // Before the day opens the send band is NEXT, not now (D26): the count runs
  // to its opening and the bar waits full.
  const beforeDay = min != null && min < DAY_FROM;
  const left =
    min == null
      ? null
      : beforeDay
        ? Math.max(0, band.from - min)
        : Math.max(0, band.to - min);
  const frac =
    min == null || beforeDay
      ? 0
      : Math.min(1, Math.max(0, (min - band.from) / (band.to - band.from)));
  const late = left != null && left <= 5 && !afterDay && !beforeDay;

  const clock = chi
    ? `${chi.getHours()}:${pad(chi.getMinutes())}:${pad(sec)}`
    : "—:——:——";
  const date = chi
    ? chi
        .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        .toUpperCase()
        .replace(/,/g, " ·")
    : "—";
  const count =
    left == null
      ? "—:——"
      : afterDay
        ? "—"
        : left >= 60
          ? `${Math.floor(left / 60)}:${pad(Math.floor(left % 60))}:${pad(Math.floor((left % 1) * 60))}`
          : `${Math.floor(left)}:${pad(Math.floor((left % 1) * 60))}`;

  return (
    <div
      className={`${styles.klaxon} ${late ? styles.kxLate : ""}`}
      aria-label="The working band, its countdown, and Chicago time"
    >
      <div className={styles.kxTop}>
        <span className={styles.kxVerb} suppressHydrationWarning>
          {afterDay ? "The day is worked." : band.verb}
        </span>
        <span className={styles.kxCount} suppressHydrationWarning>
          {count}
        </span>
      </div>
      <div className={styles.kxSub}>
        <span suppressHydrationWarning>
          {beforeDay ? "NEXT · " : ""}
          <b>{band.label}</b>
          {afterDay
            ? ""
            : beforeDay
              ? ` · OPENS ${hm(band.from)}`
              : ` · CLOSES ${hm(band.to)}`}
        </span>
        <span suppressHydrationWarning>{afterDay || beforeDay ? "" : band.next}</span>
        <span className={styles.kxCap} suppressHydrationWarning>
          {clock} · AMERICA/CHICAGO · {date}
          {wx ? ` · ${wx.toUpperCase()}` : ""}
        </span>
      </div>
      <div className={styles.kxBurn}>
        <i style={{ width: `${Math.round((1 - frac) * 100)}%` }} />
      </div>
    </div>
  );
}
