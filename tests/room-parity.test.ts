import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

// ADVERSARIAL — the consolidation contract. The room absorbed Today and the
// board; this manifest asserts every capability is actually wired into the
// client, not just remembered. If someone deletes a form or renames an
// action, this suite names the missing limb.

const root = cwd();
const client = readFileSync(join(root, "src/app/room/room-client.tsx"), "utf8");
const page = readFileSync(join(root, "src/app/room/page.tsx"), "utf8");
const css = readFileSync(join(root, "src/app/room/room.module.css"), "utf8");

describe("room client — every absorbed capability is wired", () => {
  const wirings: [string, string][] = [
    // the old board's stage machinery, whisper-sized
    ["stage checklist toggles", "toggleCheck"],
    ["stage judgment saves", "saveNote"],
    ["evidence suggestions dismiss", "dismissSuggestion"],
    // the old day sheet per account
    ["composer files notes/actions/schedules", "roomCompose"],
    ["sheet item ops (done/undo/delay/drop)", "roomTodoSet"],
    ["paste files to the account", "roomPaste"],
    ["the move closes for real", "roomClose"],
    // the roundups engine in the drawer
    ["copy & mark sent", "logTouch"],
    ["they replied", "markReplied"],
    ["I replied", "markResponded"],
    ["archive thread", "archiveThread"],
    ["mute partner", "muteRoundupPartner"],
    ["unmute partner", "unmuteRoundupPartner"],
    // check-ins
    ["push a chase to tomorrow", "delayFollowUp"],
    // the eye (was "then, if there's time")
    ["park a warming signal", "snoozeSignal"],
    ["dismiss a warming signal", "dismissTriage"],
    // the add menu
    ["arm a follow-up", "addFollowUp"],
  ];
  for (const [what, action] of wirings) {
    test(`${what} — ${action} is wired`, () => {
      assert.ok(client.includes(action), `${action} missing from room-client`);
    });
  }

  test("every cross-page form comes home to /room", () => {
    // Each server-action <form> must carry returnTo=/room or the click
    // strands the operator on the old page.
    const forms = client.match(/<form[\s\S]*?<\/form>/g) ?? [];
    const crossPage = forms.filter((f) => !/roomCompose|roomTodoSet/.test(f));
    assert.ok(crossPage.length >= 15, `only ${crossPage.length} forms found`);
    for (const f of crossPage) {
      assert.ok(
        f.includes('value="/room"'),
        `a form lacks returnTo=/room: ${f.slice(0, 120)}`,
      );
    }
  });

  test("the day sheet zones and the record all render", () => {
    for (const zone of [
      "OPEN — THIS ACCOUNT",
      "SCHEDULED",
      "COMPLETED TODAY",
      "THE RECORD",
    ]) {
      assert.ok(client.includes(zone), `zone missing: ${zone}`);
    }
  });

  test("the drawers keep their decreed names — never Cadence", () => {
    assert.ok(client.includes("ROUNDUPS"));
    assert.ok(client.includes("CHECK-INS"));
    assert.ok(client.includes("Keep an eye out"));
    assert.ok(
      !/[Cc]adence/.test(
        client.replace(/CadenceRow|CadenceDrawer|cadence[.\w[\]]*|"cadence"/g, ""),
      ),
    );
  });

  test("operator copy never says steps, and MULTI is the whole badge", () => {
    const strings = client.match(/(["'`>])([^"'`<>{}]*)\1?/g) ?? [];
    assert.ok(!strings.some((s) => /\bsteps?\b/i.test(s)), "the word 'steps' leaked");
    assert.ok(client.includes(">MULTI<") || /MULTI\s*</.test(client));
    assert.ok(!client.includes("MULTITHREADED"));
  });

  test("account links carry no arrow glyphs", () => {
    assert.ok(!client.includes("↗"));
  });
});

describe("room page — the assembly feeds the client honestly", () => {
  test("stage rail, suggestions, and sheet partitions are assembled", () => {
    for (const marker of [
      "buildStageRail",
      "suggestChecks",
      "sheetOpen",
      "sheetDelayed",
      "sheetDoneToday",
      "partnerKickoff",
      "roundupBullets",
      "roundupFrame",
      "partitionFollowUps",
      "partitionSignals",
    ]) {
      assert.ok(page.includes(marker), `page lost ${marker}`);
    }
  });
  test("no money figures can reach the room", () => {
    assert.ok(page.includes("redactMoney") || !/\$\d/.test(page));
  });
});

describe("room stylesheet — every class the client asks for exists", () => {
  test("no dangling class references", () => {
    const used = new Set<string>();
    for (const m of client.matchAll(/styles\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
      used.add(m[1]);
    }
    for (const m of client.matchAll(/styles\[`([a-z]+)_\$\{/g)) {
      // template-keyed tone classes: enumerate their known suffixes
      if (m[1] === "m") for (const t of ["g", "y", "r"]) used.add(`m_${t}`);
      if (m[1] === "c")
        for (const t of ["you", "them", "quiet", "none"]) used.add(`c_${t}`);
    }
    const defined = new Set<string>();
    for (const m of css.matchAll(/\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
      defined.add(m[1]);
    }
    const missing = [...used].filter((c) => !defined.has(c));
    assert.deepEqual(missing, [], `classes missing from room.module.css`);
  });
});
