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
import styles from "./groundwork.module.css";

const CHICAGO = { latitude: 41.8781, longitude: -87.6298 };

// The working day's bands, minutes from midnight, Chicago.
const BANDS = [
  {
    from: 7 * 60,
    to: 11 * 60,
    label: "THE SEND WINDOW",
    verb: "Send.",
    next: "NEXT · THE PEOPLE WINDOW · 11:00–14:00",
  },
  {
    from: 11 * 60,
    to: 14 * 60,
    label: "THE PEOPLE WINDOW",
    verb: "Get on the phone.",
    next: "NEXT · RESEARCH & FILING · 14:00–17:00",
  },
  {
    from: 14 * 60,
    to: 17 * 60,
    label: "RESEARCH & FILING",
    verb: "Research and file.",
    next: "NEXT · TOMORROW'S SENDS · 07:00",
  },
] as const;
const DAY_TO = BANDS[2].to;

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

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

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

  const band = min == null ? BANDS[0] : (BANDS.find((b) => min < b.to) ?? BANDS[2]);
  const afterDay = min != null && min >= DAY_TO;
  const left = min == null ? null : Math.max(0, band.to - min);
  const frac =
    min == null ? 0 : Math.min(1, Math.max(0, (min - band.from) / (band.to - band.from)));
  const late = left != null && left <= 5 && !afterDay;

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
          <b>{band.label}</b>
          {afterDay ? "" : ` · CLOSES ${Math.floor(band.to / 60)}:00`}
        </span>
        <span suppressHydrationWarning>{afterDay ? "" : band.next}</span>
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
