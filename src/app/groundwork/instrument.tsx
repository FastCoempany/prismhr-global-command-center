"use client";

// The Klaxon — the time instrument that runs the room (triptych winner,
// decided 2026-08-11). The band's command and its countdown are the masthead:
// serif verb left, burning count right, a full-width burn bar draining as the
// window empties. Inside the last five minutes the count and the bar turn red
// and pulse together; reduced motion keeps the red (pass 8 call 11). The
// capsule facts (Chicago clock, date, weather) ride the sub-row.
// Hydration-safe: em-dashes on the server, real readings after mount. Weather
// is a keyless open-meteo read; if the fetch fails the slot stays quiet — the
// room never invents a sky.

import { useEffect, useState } from "react";
import { klaxonReading, type KlaxonReading } from "@/lib/groundwork/klaxon";
import styles from "./groundwork.module.css";

const CHICAGO = { latitude: 41.8781, longitude: -87.6298 };

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

  return <KlaxonFace reading={klaxonReading(now)} wx={wx} />;
}

/** The Klaxon as it paints, from one reading: the masthead (serif verb left,
 *  count right), the sub-row (the band, the next band, and the capsule facts:
 *  Chicago clock, date, weather), and the burn bar. Inside the last five
 *  minutes the whole instrument carries the late class, and the count and the
 *  bar turn red and pulse (pass 8 call 11). No weather reading, no weather:
 *  the room never invents a sky. */
export function KlaxonFace({ reading: r, wx }: { reading: KlaxonReading; wx: string }) {
  return (
    <div
      className={`${styles.klaxon} ${r.late ? styles.kxLate : ""}`}
      aria-label="The working band, its countdown, and Chicago time"
    >
      <div className={styles.kxTop}>
        <span className={styles.kxVerb} suppressHydrationWarning>
          {r.verb}
        </span>
        <span className={styles.kxCount} suppressHydrationWarning>
          {r.count}
        </span>
      </div>
      <div className={styles.kxSub}>
        <span suppressHydrationWarning>
          {r.lead}
          <b>{r.band}</b>
          {r.edge}
        </span>
        <span suppressHydrationWarning>{r.next}</span>
        <span className={styles.kxCap} suppressHydrationWarning>
          {r.clock} · AMERICA/CHICAGO · {r.date}
          {wx ? ` · ${wx.toUpperCase()}` : ""}
        </span>
      </div>
      <div className={styles.kxBurn}>
        <i style={{ width: `${r.burnPct}%` }} />
      </div>
    </div>
  );
}
