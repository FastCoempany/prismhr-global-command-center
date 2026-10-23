// What Send in Outlook carries (ship order 2026-10-22): the demos
// we cut, the one-pagers, and the reseller and referral agreements as review
// copies. The list is the files: each one is on disk at its listed size, no
// file over 5,000,000 bytes travels, every page of both agreements carries
// the REVIEW COPY watermark, and the draft the browser builds carries each
// file whole. The door is a signed-in GET that serves a file in pieces under
// a function's response cap.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import {
  ATTACHMENTS,
  ATTACH_GROUPS,
  ATTACH_MAX_BYTES,
  ATTACH_PIECE_BYTES,
  attachmentById,
  encodedBytes,
  sizeLabel,
} from "../src/lib/collateral/attachments";
import { base64, draftWithFiles, headerWord, wrap76 } from "../src/lib/groundwork/eml";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("the list is the files", () => {
  test("every listed file is on disk at its listed size, and none passes 5 MB", () => {
    for (const a of ATTACHMENTS) {
      const size = statSync(join(root, a.path)).size;
      assert.equal(size, a.bytes, `${a.path} is ${size} bytes, listed ${a.bytes}`);
      assert.ok(a.bytes <= ATTACH_MAX_BYTES, `${a.path} passes 5,000,000 bytes`);
    }
    assert.equal(ATTACH_MAX_BYTES, 5_000_000);
  });

  test("every file under collateral/ is listed, so nothing over 5 MB hides there", () => {
    const listed = new Set(ATTACHMENTS.map((a) => a.path));
    for (const dir of ["collateral/demos", "collateral/agreements"]) {
      for (const f of readdirSync(join(root, dir))) {
        const p = `${dir}/${f}`;
        assert.ok(listed.has(p), `${p} sits in collateral/ but is not on the list`);
        assert.ok(statSync(join(root, p)).size <= ATTACH_MAX_BYTES, `${p} passes 5 MB`);
      }
    }
  });

  test("ids and names are one each; the groups hold the demos, one-pagers and agreements", () => {
    assert.equal(new Set(ATTACHMENTS.map((a) => a.id)).size, ATTACHMENTS.length);
    assert.equal(new Set(ATTACHMENTS.map((a) => a.name)).size, ATTACHMENTS.length);
    assert.deepEqual(
      ATTACH_GROUPS.map((g) => g.group),
      ["demo", "onepager", "agreement"],
    );
    const of = (g: string) => ATTACHMENTS.filter((a) => a.group === g);
    assert.ok(of("demo").length >= 1);
    for (const d of of("demo")) {
      assert.equal(d.mime, "video/mp4");
      assert.match(d.runs, /^\d+:\d\d$/, `${d.id} says how long it runs`);
    }
    assert.deepEqual(
      of("onepager")
        .map((a) => a.path)
        .sort(),
      readdirSync(join(root, "intelligence/flyers"))
        .filter((f) => f.endsWith(".pdf"))
        .map((f) => `intelligence/flyers/${f}`)
        .sort(),
      "every one-pager in the flyers folder is offered",
    );
    assert.deepEqual(
      of("agreement").map((a) => a.id),
      ["agreement-reseller", "agreement-referral"],
    );
    for (const a of of("agreement")) assert.match(a.name, /Review Copy\.pdf$/);
    for (const a of ATTACHMENTS) {
      assert.ok(!/[\\/"\r\n]/.test(a.name), `${a.id}'s name is a plain file name`);
      assert.equal(attachmentById(a.id), a);
    }
    assert.equal(attachmentById("nope"), undefined);
  });

  test("every page of both agreements carries the REVIEW COPY watermark", () => {
    for (const a of ATTACHMENTS.filter((x) => x.group === "agreement")) {
      const pdf = readFileSync(join(root, a.path));
      const raw = pdf.toString("latin1");
      const pages = raw.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
      assert.ok(pages > 0, `${a.path} has pages`);
      // The watermark is the light grey (0xC0C0C0) run of glyphs set at 45
      // degrees on every page, as the export draws it.
      let marked = 0;
      for (const m of raw.matchAll(/stream\r?\n/g)) {
        const start = m.index + m[0].length;
        const end = raw.indexOf("endstream", start);
        let text: string;
        try {
          text = inflateSync(pdf.subarray(start, end)).toString("latin1");
        } catch {
          try {
            text = inflateSync(pdf.subarray(start, end - 1)).toString("latin1");
          } catch {
            continue;
          }
        }
        if (!/0\.7529411764 0\.7529411764 0\.7529411764 rg/.test(text)) continue;
        const glyphs = text.match(
          /0\.7071067811 0\.7071067811 -0\.7071067811 0\.7071067811 [\d.]+ [\d.]+ Tm/g,
        );
        if ((glyphs?.length ?? 0) >= 10) marked++;
      }
      assert.equal(marked, pages, `${a.path}: ${marked} of ${pages} pages watermarked`);
      assert.match(
        raw,
        /REVIEW COPY|Review Copy/,
        `${a.path} names itself a review copy`,
      );
    }
  });

  test("the picker's sizes read plainly", () => {
    assert.equal(sizeLabel(4_923_553), "4.9 MB");
    assert.equal(sizeLabel(103_508), "104 KB");
    assert.equal(sizeLabel(400), "1 KB");
  });
});

describe("the draft carries every file whole", () => {
  const bytesOf = (n: number, seed = 7) => {
    const b = new Uint8Array(n);
    for (let i = 0; i < n; i++) b[i] = (i * 31 + seed) & 255;
    return b;
  };

  test("base64 matches Node's, at every remainder, and the size estimate is the size", () => {
    for (const n of [0, 1, 2, 3, 4, 5, 76, 77, 1000, 3071, 3072, 3073, 100_001]) {
      const b = bytesOf(n);
      assert.equal(base64(b), Buffer.from(b).toString("base64"), `n=${n}`);
      const wrapped = wrap76(base64(b));
      for (const line of wrapped.split("\r\n")) assert.ok(line.length <= 76);
      // Each line break the email adds rides on the estimate, the last one too.
      if (n > 0) assert.equal(wrapped.length + 2, encodedBytes(n));
    }
  });

  test("a non-ASCII subject or name goes as RFC 2047 words; ASCII stays plain", () => {
    assert.equal(headerWord("Your news on the 29th"), "Your news on the 29th");
    const w = headerWord("Señor Peña — the München hires, all of them, this quarter");
    for (const word of w.split("\r\n ")) {
      assert.match(word, /^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
      assert.ok(word.length <= 75, "an encoded word stays inside 75 characters");
    }
    const back = w
      .split("\r\n ")
      .map((x) => Buffer.from(x.slice(10, -2), "base64"))
      .reduce((a, b) => Buffer.concat([a, b]));
    assert.equal(
      back.toString("utf8"),
      "Señor Peña — the München hires, all of them, this quarter",
    );
    assert.equal(headerWord("a\r\nBcc: x@y.z"), "a Bcc: x@y.z", "no header rides in");
  });

  test("the draft is an unsent multipart message with the words and each file whole", () => {
    const files = [
      {
        name: "PrismHR Global demo - The team view.mp4",
        mime: "video/mp4",
        bytes: bytesOf(50_000),
      },
      {
        name: "Referral Agreement - Review Copy.pdf",
        mime: "application/pdf",
        bytes: bytesOf(7, 3),
      },
    ];
    const body = "Hi Cristina,\n\nThe demo is attached.\n\nAntaeus";
    const eml = draftWithFiles({
      to: { name: "Cristina Bell", email: "cristina@onstage.example" },
      subject: "The demo",
      body,
      files,
      stamp: new Date("2026-10-22T15:00:00Z"),
    });
    assert.match(eml, /^To: Cristina Bell <cristina@onstage\.example>\r\n/);
    assert.match(eml, /\r\nSubject: The demo\r\n/);
    assert.match(eml, /\r\nDate: Thu, 22 Oct 2026 15:00:00 \+0000\r\n/);
    assert.match(eml, /\r\nMessage-ID: <[a-z0-9]+\.draft@prismhr-global>\r\n/);
    assert.match(eml, /\r\nX-Unsent: 1\r\n/);
    assert.ok(!/(^|[^\r])\n/.test(eml), "every line ends CRLF");
    for (const line of eml.split("\r\n")) assert.ok(line.length <= 998);
    const boundary = /boundary="([^"]+)"/.exec(eml)![1];
    assert.ok(eml.endsWith(`\r\n--${boundary}--\r\n`));
    const parts = eml.split(`--${boundary}`).slice(1, -1);
    assert.equal(parts.length, 3);
    const decode = (p: string) =>
      Buffer.from(p.split("\r\n\r\n").slice(1).join("").replace(/\s+/g, ""), "base64");
    assert.equal(decode(parts[0]).toString("utf8"), body.replace(/\n/g, "\r\n"));
    files.forEach((f, i) => {
      assert.match(
        parts[i + 1],
        new RegExp(
          `Content-Disposition: attachment; filename="${f.name.replace(/[.]/g, "\\.")}"`,
        ),
      );
      assert.ok(
        decode(parts[i + 1]).equals(Buffer.from(f.bytes)),
        `${f.name} arrives whole`,
      );
    });
  });

  test("a name with a comma, a quote or an at sign stays one recipient", async () => {
    const { displayName } = await import("../src/lib/groundwork/eml");
    assert.equal(displayName("Cristina Bell"), "Cristina Bell");
    assert.equal(displayName("Jason Ersoff, SPHR, PHRca"), '"Jason Ersoff, SPHR, PHRca"');
    assert.equal(displayName('Pat "PJ" Jones'), '"Pat \\"PJ\\" Jones"');
    assert.equal(
      displayName("Jenny jl@amplifyhr.example"),
      '"Jenny jl@amplifyhr.example"',
    );
    assert.match(displayName("José Peña"), /^=\?UTF-8\?B\?/);
    const eml = draftWithFiles({
      to: { name: "Jason Ersoff, SPHR, PHRca", email: "jason@stitch.example" },
      subject: "Hi",
      body: "Hi",
      files: [],
      stamp: new Date("2026-10-22T15:00:00Z"),
    });
    assert.match(eml, /^To: "Jason Ersoff, SPHR, PHRca" <jason@stitch\.example>\r\n/);
    for (const email of ["a@b.example, c@d.example", "a@b.example>x", "not an address"]) {
      const bad = draftWithFiles({
        to: { name: "Pat", email },
        subject: "Hi",
        body: "Hi",
        files: [],
        stamp: new Date("2026-10-22T15:00:00Z"),
      });
      assert.ok(!/^To:/m.test(bad), `${email} never reaches To`);
    }
  });

  test("no address on file leaves To for Outlook", () => {
    const eml = draftWithFiles({
      to: { name: "Pat", email: "" },
      subject: "Hi",
      body: "Hi",
      files: [],
      stamp: new Date("2026-10-22T15:00:00Z"),
    });
    assert.ok(!/^To:/m.test(eml));
    assert.match(eml, /^Subject: Hi\r\n/);
  });
});

describe("the door is signed in and serves pieces under the cap", () => {
  const route = read("src/app/groundwork/attach/[id]/route.ts");

  test("a GET for the signed-in only, never a server action", () => {
    assert.ok(!/["']use server["']/.test(route));
    assert.match(route, /export async function GET\(/);
    assert.ok(!/export async function (POST|PUT|DELETE|PATCH)\b/.test(route));
    assert.match(route, /getAppAccess\(\)/);
    assert.match(
      route,
      /status !== "active"\)\s*return NextResponse\.json\(\{ ok: false \}, \{ status: 401/,
    );
    assert.match(route, /attachmentById\(id\)/, "it serves only listed files");
    // A cwd joined to a variable alone would ship the whole repo with the
    // route; each folder is spelled out, and every listed file sits in one.
    assert.ok(!/join\(process\.cwd\(\), file\.path\)/.test(route));
    assert.match(route, /join\(process\.cwd\(\), "intelligence", "flyers", /);
    assert.match(route, /join\(process\.cwd\(\), "collateral", /);
    for (const a of ATTACHMENTS)
      assert.match(a.path, /^(intelligence\/flyers|collateral)\/[^.]/, a.path);
  });

  test("a piece stays under Vercel's 4.5 MB response cap, and the files ship with the route", () => {
    assert.ok(ATTACH_PIECE_BYTES < 4_500_000);
    const config = read("next.config.ts");
    assert.match(config, /outputFileTracingIncludes/);
    assert.match(
      config,
      /"\/groundwork\/attach\/\[id\]":\s*\[[^\]]*"\.\/collateral\/\*\*\/\*"/,
    );
    assert.match(config, /"\.\/intelligence\/flyers\/\*\.pdf"/);
  });

  test("the picker adds no orange and opens shut", () => {
    const picker = read("src/app/groundwork/attach-picker.tsx");
    assert.ok(!/btnAccent|ds-orange|#E6701E/i.test(picker));
    assert.match(picker, /<details className=\{styles\.attach\}>/);
    const letter = read("src/app/groundwork/letter.tsx");
    assert.equal(letter.match(/styles\.btnAccent/g)?.length, 1);
    assert.match(letter, /<AttachPicker picked=\{picked\} onChange=\{setPicked\} \/>/);
    // The saved draft keeps the person's name whole: accents and apostrophes stay.
    assert.ok(!letter.includes("[^\\w .-]"));
    assert.match(letter, /a\.download = `Note to \$\{name \|\| "them"\}\.eml`;/);
  });
});
