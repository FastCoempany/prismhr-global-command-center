// The HomeRoom's map (ship order 2026-11-04, F26): land drawn as dots on a
// two-degree grid, read from Natural Earth's 50m land outline, and where each
// country the read can name sits on it. A fixed table: nothing here reads the
// record, so the map needs no new reading (docs/mockups/homeroom-f-decks-2026-11-04.html).

export const MAP = { lon0: -168, lat0: 74, step: 2, cols: 162, rows: 58 } as const;

/** One bit per grid cell, row-major, base64. A set bit is land. */
const MASK =
  "AAADwBQAAP//gAAAAACAAP/gAIAAAADfTC+AH//gAAAAAMBi///+DoH/gYP8w74F//gAAB4AAj///////P///4Zdj8D/wAAAP/5f/v//////f/////+hyD+AeAAf/H/////////D/////9w8B8AcAB+/v/////////P/////wPAA4AAAH5///////////f0P///gDgAIAAAH8D//////////AgC///wD+AAAACA5f////////+ACAAf//+D/AAAACBx/////////4AAAA////n/wAAAZB//////////6AAAAP///3/4AAAbn///////////AAAAH////4IAAAAf//////////+AAAAD////4cAAAD///////////8AAAAB////+gAAAA//9fn//////5EAAAD////0AAAAA+v4PP//////xgAAAD////gAAAAPwz4Hn//////AAAAAD///+AAAAAPoLP/n/////cCAAAAB///8AAAAAPAZv/n/////GCAAAAA///8AAAAAAfAA///////iGAAAAAf//8AAAAAH/AA///////g4AAAAAP//wAAAAAP/zg///////gAAAAAAD/8QAAAAAP////P/////gAAAAAAF/AQAAAAA/////v/////gAAAAAAC/AAAAAAB////fx/////AAAAAAABfAAAAAAB////P2D///+AAAAAAAAPAoAAAAD////v/B/7/4AAAAAAAAPGCAAAAD////n+Afx/AAAAAAAAAH8AEAAAD////3+AfA/AQAAAAAAAAsAAAAAD////z4AeAfggAAAAAAAAHgAAAAD////7AAOAPgAAAAAAAAABgwAAAD////8AAMADgIAAAAAAAAAheAAAA/////wAEABAAAAAAAAAAAH/gAAA/////gACAIAMAAAAAAAAAD/wAAAfn///gAAAEBAAAAAAAAAAD/+AAAAB///AAAAUGAAAAAAAAAAH/+AAAAB//+AAAAKOAAAAAAAAAAP//AAAAB//8AAAAMegAAAAAAAAAP//wAAAB//4AAAAHOhUAAAAAAAAP//+AAAA//wAAAACAwPgAAAAAAAP///gAAAf/wAAAABAAD0AAAAAAAH///gAAAf/wAAAAAMAHQAAAAAAAH///AAAAf/wAAAAAAoAIAAAAAAAD///AAAAf/4AAAAAAARAAAAAAAAD//+AAAAf/4wAAAAABxAAAAAAAAB//+AAAA//5gAAAAAH5gAAAAAAAAf/+AAAA//hgAAAAAP/wAAAAAAAAf/8AAAAf/BgAAAAA//4AAAAAAAAf/8AAAAP/DgAAAAH//4AAAAAAAAf/gAAAAP/DAAAAAH//8AAAAAAAAf/AAAAAP+AAAAAAD//+AAAAAAAAf/AAAAAP+AAAAAAD//+AAAAAAAAf+AAAAAH8AAAAAAD//+AAAAAAAAf+AAAAAD4AAAAAAD+f+AAAAAAAAf8AAAAADgAAAAAADAP8AAAAAAAA/wAAAAAAAAAAAAAAAD8AAAAAAAA/wAAAAAAAAAAAAAAABwAAAAAAAA+AAAAAAAAAAAAAAAAAoA=";

/** The land as one SVG path of small circles, in grid units. */
export function landPath(): string {
  const bin =
    typeof atob === "function"
      ? atob(MASK)
      : Buffer.from(MASK, "base64").toString("binary");
  let d = "";
  for (let i = 0; i < MAP.cols * MAP.rows; i++) {
    if (!(bin.charCodeAt(i >> 3) & (128 >> (i & 7)))) continue;
    const x = (i % MAP.cols) + 0.5;
    const y = Math.floor(i / MAP.cols) + 0.5;
    d += `M${(x - 0.3).toFixed(1)} ${y}a.3 .3 0 1 0 .6 0a.3 .3 0 1 0 -.6 0`;
  }
  return d;
}

/** Longitude and latitude of each country's marker, keyed like COUNTRY_NAME. */
export const GEO: Record<string, readonly [number, number]> = {
  ca: [-100, 56.5],
  bg: [25.5, 42.7],
  mx: [-102.5, 23.6],
  gb: [-2.5, 54],
  in: [78.9, 22.5],
  ph: [122.5, 12.5],
  za: [24.5, -29],
  es: [-3.7, 40.2],
  de: [10.4, 51.1],
  tr: [35, 39],
  bs: [-77.4, 24.5],
  ma: [-6.5, 32],
  au: [134, -25.5],
  fr: [2.4, 46.6],
  cn: [104, 35],
  br: [-52, -10.5],
  co: [-74.3, 4.6],
  ar: [-64.5, -34.5],
  pl: [19.4, 52],
  pt: [-8.2, 39.6],
  ie: [-8, 53.2],
  nl: [5.3, 52.2],
  jp: [138.5, 36.5],
  sg: [103.8, 1.35],
  cr: [-84, 9.8],
  vn: [106, 15.5],
  pr: [-66.5, 18.2],
};

/** Where a country's marker sits, in percent of the map's width and height;
 *  null for a code the table does not hold. */
export function mapXY(code: string): [number, number] | null {
  const g = GEO[code];
  if (!g) return null;
  const [lon, lat] = g;
  return [
    (((lon - MAP.lon0) / MAP.step + 0.5) / MAP.cols) * 100,
    (((MAP.lat0 - lat) / MAP.step + 0.5) / MAP.rows) * 100,
  ];
}
