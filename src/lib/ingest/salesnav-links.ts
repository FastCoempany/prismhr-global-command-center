// The links in a Sales Navigator alert email, unwrapped (2026-10-15).
//
// Every link in the operator's alert emails arrives twice wrapped: PrismHR's
// mail gateway rewrites it through Proofpoint URL Defense (urldefense.com
// v3), and LinkedIn's own link is a tracking redirect (sales-web-view →
// contract-chooser → the Sales Navigator page). This module undoes both and
// keeps only the page: a lead, an alert's post, an InMail, an account's
// employee list. The tracking tokens (trk, lipi, midToken, midSig, eid) are
// dropped, so a link files the same from two emails.
//
// A link survives only when it lands on https://www.linkedin.com/sales/. A
// link to anywhere else, or one that will not decode, is dropped: the column
// never renders an address it did not read off LinkedIn. Pure.

const RUN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Proofpoint URL Defense v3 decoded: the wrapped address with every `*`
 *  put back from the replacement bytes, and `**X` runs read by the run
 *  table. Null when the text is not a v3 link or does not decode. */
export function unwrapUrlDefense(wrapped: string): string | null {
  const m = /^https:\/\/urldefense\.com\/v3\/__(.+?)__;([A-Za-z0-9_-]*)!/.exec(
    (wrapped ?? "").trim(),
  );
  if (!m) return null;
  const encoded = m[1]!;
  let replacement: string;
  try {
    const b64 = m[2]!.replace(/-/g, "+").replace(/_/g, "/");
    replacement = Buffer.from(
      b64 + "=".repeat((4 - (b64.length % 4)) % 4),
      "base64",
    ).toString("utf8");
  } catch {
    return null;
  }
  const chars = [...replacement];
  let at = 0;
  let out = "";
  for (let i = 0; i < encoded.length; i++) {
    const c = encoded[i]!;
    if (c !== "*") {
      out += c;
      continue;
    }
    if (encoded[i + 1] === "*") {
      const run = RUN_ALPHABET.indexOf(encoded[i + 2] ?? "");
      if (run < 0) return null;
      out += chars.slice(at, at + run + 2).join("");
      at += run + 2;
      i += 2;
      continue;
    }
    if (at >= chars.length) return null;
    out += chars[at++];
  }
  return out;
}

/** LinkedIn's tracking keys. Everything else on a Sales Navigator page is
 *  the page itself (a search's query, an InMail's msgType) and stays as it
 *  was written. */
const TRACKING = new Set([
  "trk",
  "lipi",
  "midToken",
  "midSig",
  "trkEmail",
  "eid",
  "showAppPrompt",
  "useCase",
  "contractId",
]);

const SALES = /^https:\/\/www\.linkedin\.com\/sales\//;

/** A Sales Navigator page from any of the forms it arrives in: wrapped by
 *  URL Defense or not, through sales-web-view and the contract chooser or
 *  direct. Null unless it lands on https://www.linkedin.com/sales/. */
export function salesNavPage(raw: string): string | null {
  // A malformed escape (`%ZZ`) in a filed link must never take a page down.
  try {
    return salesNavPageOf(raw);
  } catch {
    return null;
  }
}

function salesNavPageOf(raw: string): string | null {
  let url = (raw ?? "").trim().replace(/\$$/, "");
  if (/^https:\/\/urldefense\.com\//.test(url)) url = unwrapUrlDefense(url) ?? "";
  for (let hop = 0; hop < 3 && url; hop++) {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return null;
    }
    if (u.protocol !== "https:" || u.hostname !== "www.linkedin.com") return null;
    if (u.pathname === "/sales-web-view") {
      url = u.searchParams.get("url") ?? "";
      continue;
    }
    if (u.pathname === "/sales/contract-chooser") {
      const redirect = u.searchParams.get("redirect") ?? "";
      if (!redirect.startsWith("/sales/")) return null;
      url = `https://www.linkedin.com${redirect}`;
      continue;
    }
    if (!u.pathname.startsWith("/sales/")) return null;
    // The raw query, pair by pair, so a search keeps its own encoding.
    const q = u.search
      .replace(/^\?/, "")
      .split("&")
      .filter((pair) => pair && !TRACKING.has(decodeURIComponent(pair.split("=")[0]!)))
      .join("&");
    const page = `https://www.linkedin.com${u.pathname}${q ? `?${q}` : ""}`;
    return SALES.test(page) ? page : null;
  }
  return null;
}

/** A link line in an alert email ("View post: …", "Message: …", "View
 *  employees: …") read as the button it becomes and the page it opens.
 *  Null for a line that is not one, or a link that is not a Sales
 *  Navigator page. */
export function alertLink(line: string): { label: string; href: string } | null {
  const m = /^(view(?: [a-z][a-z ]*?)?|message)\s*:\s*(https?:\/\/\S+)/i.exec(
    (line ?? "").trim(),
  );
  if (!m) return null;
  const href = salesNavPage(m[2]!);
  if (!href) return null;
  return { label: linkLabel(m[1]!.toLowerCase(), href), href };
}

function linkLabel(said: string, href: string): string {
  if (said === "message" || /msgType=inmail/i.test(href)) return "InMail";
  if (/\/sales\/alert\//.test(href) || said === "view post") return "Post";
  if (/\/sales\/lead\//.test(href)) return "Profile";
  if (/\/sales\/(company|account)\//.test(href)) return "Account";
  if (/\/sales\/search\/people/.test(href)) return "See who's active";
  return "Open";
}

/** The Sales Navigator company id a link names: an account page's own, or
 *  the company filter of an employee search ("View employees"). */
export function companyIdOf(href: string): string {
  const page = /\/sales\/company\/(\d+)/.exec(href ?? "");
  if (page) return page[1]!;
  let text = href ?? "";
  try {
    text = decodeURIComponent(text);
  } catch {
    // a malformed escape: read the raw text
  }
  const filter = /(?:companyV2|CURRENT_COMPANY)[^]*?id(?::|%3A)(\d+)/i.exec(text);
  return filter ? filter[1]! : "";
}

/** A Sales Navigator search for a person or a company by name, for an alert
 *  that carried no link of its own (the feed grab copies no links). */
export function salesNavSearch(kind: "people" | "company", name: string): string {
  const q = encodeURIComponent(`(keywords:${(name ?? "").replace(/[()]/g, " ").trim()})`);
  return `https://www.linkedin.com/sales/search/${kind}?query=${q}`;
}

/** The line a link files as inside an alert's row, and its reader. The
 *  router never reads past an alert's first two lines, so a link line
 *  routes nothing (src/lib/ingest/grab.ts). */
export const LINK_PREFIX = "Link · ";
export function linkLine(l: { label: string; href: string }): string {
  return `${LINK_PREFIX}${l.label} · ${l.href}`;
}
export function readLinkLine(line: string): { label: string; href: string } | null {
  const m =
    /^Link · ([A-Za-z' ]{2,24}) · (https:\/\/www\.linkedin\.com\/sales\/\S+)$/.exec(
      (line ?? "").trim(),
    );
  if (!m) return null;
  // The filed text is read back through the same gate it filed through, so
  // a hand-made line that walks out of /sales/ ("/sales/../redir") is dropped.
  const href = salesNavPage(m[2]!);
  return href ? { label: m[1]!, href } : null;
}

/** Whether a line is a filed link line, valid or not: every reader of an
 *  alert's own lines skips it. */
export const isLinkLine = (line: string): boolean =>
  (line ?? "").trim().startsWith(LINK_PREFIX);
