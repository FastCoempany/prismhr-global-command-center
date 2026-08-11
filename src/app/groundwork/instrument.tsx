"use client";

// The instrument capsule — Chicago clock with ticking seconds, the date, the
// weather outside, and the band the working day is in. Decreed part of the
// winged stage (CLAUDE.md). Hydration-safe: em-dashes on the server, real
// readings after mount. The weather is a keyless open-meteo read for the
// desk's own city; if the fetch fails the slot stays quiet — the room never
// invents a sky.

import { useEffect, useState } from "react";
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

  const time = now
    ? now.toLocaleTimeString("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—:——:——";
  const date = now
    ? now
        .toLocaleDateString("en-US", {
          timeZone: "America/Chicago",
          weekday: "short",
          month: "short",
          day: "numeric",
        })
        .toUpperCase()
        .replace(/,/g, " ·")
    : "—";
  const hour = now
    ? Number(
        now.toLocaleString("en-US", {
          hour: "numeric",
          hour12: false,
          timeZone: "America/Chicago",
        }),
      )
    : null;
  const band =
    hour == null
      ? "—"
      : hour < 11
        ? "sends · until 11:00"
        : hour < 14
          ? "the people window"
          : "research & filing";

  return (
    <div
      className={styles.instr}
      aria-label="Chicago time, weather, and the working band"
    >
      <span className={styles.instrDigits} suppressHydrationWarning>
        {time}
      </span>
      <span>America/Chicago</span>
      <span suppressHydrationWarning>{date}</span>
      {wx && <span className={styles.instrWx}>{wx}</span>}
      <span className={styles.instrBand} suppressHydrationWarning>
        {band}
      </span>
    </div>
  );
}
