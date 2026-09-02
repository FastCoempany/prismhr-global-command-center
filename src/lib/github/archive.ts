// The vault run — every file dropped on a HomeRoom row archives to the
// GitHub vault repo, named by its account (founder-decreed 2026-09-02).
// The BROWSER does the carrying: GitHub's API takes browser calls directly,
// so the file never transits the app's server (whose request cap could not
// hold a recording anyway). The server's only part is handing this code a
// short grant — see src/app/room/archive-actions.ts. This module never
// reads the environment: a credential has no business existing in a bundle.
//
// Two lanes, GitHub's own boundary between them:
//   · 25MB and under — a plain repo file at accounts/<Account Name>/<file>.
//   · larger — a PRE-RELEASE cut for the drop (tag, title, description) with
//     the file streamed up as a binary asset; assets carry to 2GB.

export const ARCHIVE_LIMIT_BYTES = 25 * 1024 * 1024;
export const ASSET_CAP_BYTES = 2 * 1024 * 1024 * 1024;

export type ArchiveGrant = { repo: string; token: string };
export type ArchiveResult =
  | { ok: true; kind: "file" | "release"; url: string; detail: string }
  | { ok: false; reason: string };

/** Which lane a file takes, by size alone. */
export function laneFor(bytes: number): "file" | "release" | "too-big" {
  if (bytes > ASSET_CAP_BYTES) return "too-big";
  return bytes <= ARCHIVE_LIMIT_BYTES ? "file" : "release";
}

const BAD_SEGMENT = /[\\/:*?"<>|#%]+/g;

/** A path segment GitHub and humans both read: the account's own name with
 *  the characters git paths cannot carry folded to "-". Never a slug — the
 *  folder is NAMED BY the account, not coded after it. */
export function sanitizeSegment(name: string): string {
  return (
    (name ?? "")
      .replace(BAD_SEGMENT, "-")
      .replace(/\s+/g, " ")
      .replace(/^[\s.-]+|[\s.]+$/g, "")
      .trim() || "unnamed"
  );
}

/** Tag names are machine-safe and unique by the second: acct-<slug>-<stamp>. */
export function tagFor(account: string, when: Date): string {
  const slug =
    (account ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "unnamed";
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${when.getUTCFullYear()}${p(when.getUTCMonth() + 1)}${p(when.getUTCDate())}-${p(when.getUTCHours())}${p(when.getUTCMinutes())}${p(when.getUTCSeconds())}`;
  return `acct-${slug}-${stamp}`;
}

/** The release's face: title names the account and file; the body says what
 *  this is and where it came from. No money ever rides an archive face. */
export function releaseMetaFor(inp: {
  account: string;
  fileName: string;
  bytes: number;
  when: Date;
}): { tag_name: string; name: string; body: string; prerelease: true } {
  const day = inp.when.toISOString().slice(0, 10);
  return {
    tag_name: tagFor(inp.account, inp.when),
    name: `${inp.account} — ${inp.fileName}`,
    body: [
      `Account: ${inp.account}`,
      `File: ${inp.fileName}`,
      `Bytes: ${inp.bytes}`,
      `Dropped: ${day}`,
      `Filed by Field Signal — too large for a repo file, carried as a release asset.`,
    ].join("\n"),
    prerelease: true,
  };
}

const gh = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function fileToBase64(f: File): Promise<string> {
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK)
    bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  return btoa(bin);
}

/** Archive one dropped file. Small files land as accounts/<name>/<file>; a
 *  name already taken gets the drop's timestamp folded in — the vault never
 *  overwrites. Large files cut a pre-release and carry as an asset. */
export async function archiveFileToGitHub(inp: {
  file: File;
  accountName: string;
  grant: ArchiveGrant;
  now?: Date;
}): Promise<ArchiveResult> {
  const { file, grant } = inp;
  const when = inp.now ?? new Date();
  const lane = laneFor(file.size);
  if (lane === "too-big")
    return { ok: false, reason: `${file.name} is over GitHub's 2GB asset cap.` };
  const account = sanitizeSegment(inp.accountName);
  const fname = sanitizeSegment(file.name);

  try {
    if (lane === "file") {
      const base = `https://api.github.com/repos/${grant.repo}/contents/accounts`;
      let path = `${encodeURIComponent(account)}/${encodeURIComponent(fname)}`;
      const probe = await fetch(`${base}/${path}`, { headers: gh(grant.token) });
      if (probe.status !== 404) {
        const stamp = tagFor("x", when).slice(7);
        const dot = fname.lastIndexOf(".");
        const stamped =
          dot > 0
            ? `${fname.slice(0, dot)} ${stamp}${fname.slice(dot)}`
            : `${fname} ${stamp}`;
        path = `${encodeURIComponent(account)}/${encodeURIComponent(stamped)}`;
      }
      const put = await fetch(`${base}/${path}`, {
        method: "PUT",
        headers: { ...gh(grant.token), "content-type": "application/json" },
        body: JSON.stringify({
          message: `archive: ${account} — ${fname}`,
          content: await fileToBase64(file),
        }),
      });
      const j = (await put.json().catch(() => ({}))) as {
        content?: { html_url?: string };
        message?: string;
      };
      if (!put.ok)
        return { ok: false, reason: `GitHub said: ${j.message ?? put.status}` };
      return {
        ok: true,
        kind: "file",
        url: j.content?.html_url ?? `https://github.com/${grant.repo}`,
        detail: `accounts/${account}/${fname}`,
      };
    }

    const meta = releaseMetaFor({
      account: inp.accountName,
      fileName: file.name,
      bytes: file.size,
      when,
    });
    const rel = await fetch(`https://api.github.com/repos/${grant.repo}/releases`, {
      method: "POST",
      headers: { ...gh(grant.token), "content-type": "application/json" },
      body: JSON.stringify(meta),
    });
    const rj = (await rel.json().catch(() => ({}))) as {
      upload_url?: string;
      html_url?: string;
      message?: string;
    };
    if (!rel.ok || !rj.upload_url)
      return { ok: false, reason: `GitHub said: ${rj.message ?? rel.status}` };
    const uploadUrl = `${rj.upload_url.split("{")[0]}?name=${encodeURIComponent(fname)}`;
    const up = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        ...gh(grant.token),
        "content-type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!up.ok) {
      const uj = (await up.json().catch(() => ({}))) as { message?: string };
      return {
        ok: false,
        reason: `The asset upload failed — ${uj.message ?? up.status}`,
      };
    }
    return {
      ok: true,
      kind: "release",
      url: rj.html_url ?? `https://github.com/${grant.repo}/releases`,
      detail: meta.tag_name,
    };
  } catch {
    return { ok: false, reason: "GitHub was unreachable. The file did not archive." };
  }
}
