# Ground-Up Build Prompt — Reusable Scaffold (Claude Code / Opus 4.8)

> Principle: pin the **expensive, irreversible, and taste** decisions hard; leave
> implementation open. Opus 4.8 makes better implementation calls with full-codebase
> context than you can make blind. A prompt that over-specifies fights the model's
> strengths and buries the one line that actually resolves ambiguity.

---

## Run it in two stages

**Stage 1 — Interrogate & plan (no code).** Paste the scaffold below ending at the
"First move" section set to *plan only*. Review the spec, the assumptions log, and
the open questions it returns. Correct course here, where it's cheap.

**Stage 2 — Build.** Once the plan is right, reply: "Plan approved. Build per the
agreed spec. Same working agreement applies."

Durable conventions (stack, structure, style, test policy) go in `CLAUDE.md`, not the
prompt — they load every session and don't belong in a per-build message.

---

## The scaffold

### 0 — North star (ONE sentence; this is the tiebreaker)
> When any decision is ambiguous or my notes are silent, optimize for: **<the single
> thing that matters most — e.g. "fastest path to a working end-to-end demo of the
> core loop, even if ugly" / "correctness and auditability over speed" / "minimal
> dependencies, easy to rip out">.**

*This is the highest-leverage line in the whole prompt. Without it the agent guesses
on every fork. With it, it self-adjudicates.*

### 1 — What this is (2–3 sentences, plain)
> <What the app does, who it's for, why it exists. The one user job it must nail.>

### 2 — Raw notes (verbatim — do NOT clean these up)
```
<paste your actual rough notes here, typos and "maybe??" and all>
```

### 3 — Hard constraints
- **Language/stack:** Python; <FastAPI / CLI / Streamlit / etc.>. <ORM or no ORM.>
- **Must-haves (v0):** <the 2–4 things without which it's pointless>
- **Explicitly OUT of scope for v0:** <auth, multi-tenancy, real DB, etc. — negative
  space matters; it stops the agent's default-toward-completeness from over-building>
- **Persistence:** <"flat files / SQLite for v0, no Postgres yet" — or leave open and
  flag in §6 as a stop-and-ask>
- **Deploy target:** <local only / Cloudflare / Railway / "don't care yet">
- **Dependencies:** <"stdlib + <short list>; ask before adding anything else">

### 4 — Open questions I already know are open
> <List the gaps you can see. Seeding these makes the plan *address* them instead of
> papering over them. e.g. "Do we need historical state or is latest-only fine?"
> "Sync or async ingestion?">

### 5 — Definition of done (how we'll both know it works)
> v0 is done when: `<one concrete user flow runs end to end>` — specifically:
> 1. <step>  2. <step>  3. <observable result>.
> Plus: <tests for the core logic / a `make demo` or single command that proves it>.

### 6 — Working agreement (your control surface under --dangerously-skip-permissions)
- **Plan first.** Do not write application code until you've produced: (a) a tight
  spec, (b) a proposed file/module structure with rationale, (c) an assumptions log,
  (d) the open questions you need answered. Wait for my approval.
- **Log assumptions.** Where my notes are silent, make a reasonable call AND record it
  in `DECISIONS.md` (decision · why · what would change it) so I can override.
- **Stop and ask me before:** choosing the persistence layer; adding any
  architecture-locking dependency; any destructive op (migration, bulk delete, rm,
  schema change); deleting more than a handful of files; anything touching secrets.
- **Commit cadence:** small, working, message-per-logical-unit. Never commit broken
  state or secrets.
- **When genuinely stuck or 50/50:** stop and ask. Don't guess on forks that are
  expensive to reverse.

### 7 — First move
> **Stage 1:** Don't write any application code. Read the notes, then produce the
> spec, proposed structure, assumptions log, and open questions. Interrogate my notes
> — tell me where they're contradictory, underspecified, or where I'm probably wrong.

---

## Anti-patterns (what to leave OUT)
- **A fully-specified file tree.** Let it propose one with codebase context; you'll
  get better structure and a rationale you can argue with.
- **Fake precision.** Label guesses as guesses ("~50 users, unsure"). Confident wrong
  numbers get silently baked into architecture.
- **One mega-prompt that one-shots the app.** That's the setup for fast-and-wrong.
- **Polished notes.** You lose the signal in your own hedging.
- **Conventions in the prompt.** Those go in `CLAUDE.md` — reused every session.
