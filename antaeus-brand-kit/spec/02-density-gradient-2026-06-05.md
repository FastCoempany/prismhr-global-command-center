# Antaeus Design System — Density Gradient

**Status:** DRAFT for founder review.
**Date:** 2026-06-05.
**Author:** Claude, working session with the founder (mrcoe7@gmail.com).
**Branch:** `claude/antaeus-gtmos-design-system`.
**Scope:** This is the second sibling document under the design system charter (`00-charter-2026-06-02.md`). It specifies how the same primitives serve the day-one operator and the fluent operator without forking into two products — two operator-facing states, four concrete dimensions, one per-workspace setting, Phase F-style proposals at named milestones.

---

## 0. Why this exists

The charter's §4.7 pinned the density baseline at Sarah-day-90 and named the day-one decompression as a structural property the design system commits to honoring rather than a per-room toggle. The voice-as-component spec (`01-voice-as-component-2026-06-04.md`) carried the orthogonal promise: voice stays constant across the gradient, density adjusts quantity, the two specs do not interfere. What both documents left open is the actual mechanism — how decompression works, what specifically gets more or less of itself when the gradient adjusts, who decides which state a workspace ships in, and how the system surfaces the option to change.

This spec resolves those questions. It commits to two operator-facing states (Show me how, Step back), four concrete dimensions density adjusts along, one per-workspace setting that lives in `workspace_profile` in Supabase, and a Phase F-style proposal layer that surfaces the option to switch at named fluency milestones. The operator always has final say. The system surfaces the option but never crosses the agency boundary without an explicit accept.

The charter signal #1 (the stranger walks in) and signal #2 (the fluent operator jumps) are what the gradient serves. Signal #3 (the hybrid case works) is served not by per-room density but by separate workspace-context affordances (prefilled breadcrumbs, workspace-specific tooltips) the today-surface spec will resolve. Density is one dimension of the operator's experience; it is not the only dimension.

---

## Part I — What the density gradient is

### 1.1 Two states for two operating realities

The gradient ships with two discrete states.

**Show me how** is the decompressed state. The system walks the operator through every surface — explanations under primitives, tooltips on hover, sections default-expanded, three-to-five sentences where one would do for a fluent operator. The day-one operator who has never used Antaeus opens the product and finds the system actively helping them understand what they are looking at and what to do next.

**Step back** is the fluent state. The system trusts the operator to know their way around: explanations recede, tooltips disappear, and sections default to collapsed with one-line headers carrying their state. One sentence does the work three would have done in Show me how. Sarah-day-90 opens the product and the surfaces are dense, ranked, and immediate. The system stays out of her way.

Both states render the same primitives and carry the same voice. The Antaeus voice does not change between Show me how and Step back; the peer operator with B2B sales scars speaks the same way in both states. What changes is how much of the voice each surface ships at a time, which is the quantity-not-personality framing the voice spec already pinned.

Two states rather than three or a continuous gradient — the spec commits to two because two gives component authors concrete render targets to design against and gives operators stable surfaces that change at observable moments rather than imperceptibly drifting as fluency creeps up. A future v2 can add a third state if the migration audit produces real data showing two is too coarse for specific rooms or specific operator paths.

### 1.2 What the gradient actually adjusts

Density operates on four concrete dimensions. Every density-responsive component addresses all four; non-responsive components ignore the state and render one way regardless.

**Sentence count.** Show me how surfaces ship three-to-five sentences explaining what is on screen and why; Step back ships one sentence carrying the same operating substance. Both pass the voice validator under the same family-temperature rules; the difference is verbosity, not personality.

**Affordance count.** Show me how reveals all available actions visibly, each labeled clearly. Step back reveals the primary action and one or two secondary actions, with the rest collapsed into a "More" menu or surfaced on hover. The operator at Show me how does not have to learn which actions exist by hovering; the operator at Step back already knows.

**Default-expanded sections.** Show me how opens with every section expanded so the operator sees the full structure of the surface immediately. Step back opens with only the highest-pressure or most-recent section expanded; the others render as one-line headers carrying their state, expandable on click.

**Annotation density.** Show me how renders tooltips on hover for any non-obvious affordance and microcopy under input fields explaining what to enter. Step back removes tooltips (the operator knows what controls do) and drops the microcopy (the operator knows the data shape).

The four dimensions compose. A single primitive renders differently along all four when density flips. The four-dimension structure is what makes the same primitive serve both operator realities without forking into two products.

### 1.3 Voice is unaffected — the orthogonality promise

The voice-as-component spec §4.3 already committed that voice stays constant across density. This spec ratifies that promise from the density side: the validator the voice spec specifies does not know about the density state, and the density state does not know about the voice family. A Threshold room at Show me how speaks in the Threshold temperature; the same room at Step back speaks in the same Threshold temperature; both pass the same voice validator. Density adjusts how much voice the surface ships per render; the voice family adjusts how the voice modulates per room job. They are orthogonal axes deliberately, so neither has to re-learn the other when either one tunes.

---

## Part II — The state mechanism

### 2.1 The two states named

The technical layer calls them `show_me_how` and `step_back`. The operator-facing strings render them as "Show me how" and "Step back." The peer-voice phrasing — first-person operator addressing the system — was chosen during this session over more clinical alternatives ("Guided" / "Trim") because it carries the same agency framing the Phase F proposal layer uses: the operator is telling the system how to behave.

A workspace ships in exactly one of the two states at any moment. The state is stored on `workspace_profile.density_state` as a typed enum (`'show_me_how' | 'step_back'`). The state is workspace-scoped per the charter's commitment to memory and continuity (canon Part II.5 §7's first behavioral property) — opening a workspace from a different browser session reads the same density state.

### 2.2 Operator-declared baseline

The operator picks the density state and the system honors that pick. The operator can change the state at any time from Settings, and the change takes effect on the next render of any density-responsive component.

The Settings affordance reads in peer voice rather than technical language: "How do you want the system to show up? Show me how — the system walks me through every surface. Step back — the system trusts me to know my way around. You can switch any time." The toggle persists immediately; no Save button, no confirmation modal — changing the state is the operator stating their preference.

The brand-new-workspace default before the operator picks is `show_me_how`, since the operator who just landed has not yet had the chance to choose and the onboarding flow itself is the most walked-through surface in the system. After onboarding completes, the first Phase F proposal fires (described in §2.3) and asks the operator to confirm or switch.

Existing-workspace default on the day the gradient ships is `step_back`, since existing operators have acclimated to the current single-state product and the surfaces approximate Step back today. The backfill does not change what existing operators see — surfaces continue rendering as they did before the gradient existed. The gradient-available milestone (§2.4) fires on first login post-migration and surfaces the option through Phase F so existing operators get an explicit choice rather than an implicit backfill default.

### 2.3 Phase F-style proposals at named milestones

The system never changes the density state without an explicit operator accept. But the system does surface the option to change at named fluency milestones, using the existing Phase F proposal pattern from canon Part II.5 §7. The proposal pattern was originally specified for bounded self-modification (the system proposing skill refinements and observation generators the operator accepts or refuses). Density gradient extends the same pattern to the density question: at milestone moments, the system asks the operator whether their density preference has changed.

A density proposal renders in the same Phase F proposal surface as other Phase F proposals — the Briefing Suggestions section per canon §4.21, plus the surface the today-surface spec will eventually decide. The proposal copy is peer-voice and specific to the milestone:

> "You closed your first deal last week. The system has been walking you through every surface — want it to step back? You can switch back any time."

The operator accepts (state flips), dismisses (state holds, ask again in a month — 30-day cooldown), or snoozes (state holds, ask again in a week — 7-day cooldown). Standard Phase F cooldown semantics apply per canon Part II.5 §7.

At the schema level, density proposals are a new kind alongside the existing Phase F kinds. The `proposed_modifications.kind` enum (canon Part II.5 §7, established by ADR-017) gains `'density_change'` as a third value, alongside the existing `'skill_default'` and `'observation_generator'`. The density proposal payload carries `from_state`, `to_state`, and `milestone` fields:

```typescript
type DensityChangePayload = {
  kind: 'density_change';
  from_state: 'show_me_how' | 'step_back';
  to_state: 'show_me_how' | 'step_back';
  milestone: 'onboarding_complete' | 'first_deal_closed' | 'first_proof_cast' | 'first_discovery_completed' | 'gradient_available';
};
```

The apply path extends the existing Phase F apply logic from ADR-017. On accept, the handler writes `to_state` to `workspace_profile.density_state` (with realtime sync per §2.5). On dismiss, the handler records the dismissal and sets a 30-day cooldown on the same milestone. On snooze, a 7-day cooldown. The dispatch through Phase F means density proposals appear in the same operator-facing surface as other Phase F proposals (the Briefing Suggestions section per canon §4.21) and respect the same workspace-level Phase F toggle (`workspace_profile.phase_f_proposals_enabled`) — an operator who has disabled Phase F sees no density proposals and changes density only through Settings.

### 2.4 Named milestones

Five milestones trigger density proposals. Four fire on operator events in new and existing workspaces alike; the fifth fires once per existing workspace on first login post-migration to bridge the gap for operators whose fluency milestones already passed.

**Onboarding complete.** Fires the first proposal in new workspaces. The operator just finished the walked-through onboarding flow; the proposal asks whether to keep being walked through or to switch to Step back. This is the initial-state-choice moment, framed as a real decision rather than a setting buried in a menu.

**First deal closed.** Fires when a deal in Deal Workspace transitions to `closed_won` or `closed_lost` for the first time in the workspace. The operator has run a deal end-to-end; if they are still in Show me how, the proposal offers Step back. If they are already in Step back, no proposal fires (the milestone is informational, not actionable).

**First proof cast.** Fires when `freezeDraftIntoProof` runs successfully for the first time in the workspace (canon §4.15 PoC Framework — the operator has filled the four molds and saved a deal-linked Proof). Same conditional logic — only proposes Step back if the operator is still in Show me how.

**First Discovery call completed.** Fires when a Discovery Studio session reaches the post-call routing segment (canon §4.12, segment 10) for the first time. The operator has run discovery on a live conversation; same conditional proposal.

**Gradient available (existing workspaces only).** Fires once per existing workspace on first login after the gradient ships. The migration backfill sets those workspaces to `step_back` (the closest approximation of the current single-state product); this proposal asks the operator to confirm the backfill or switch to Show me how. The fifth milestone bridges the gap between existing operators — whose fluency milestones likely already passed before the gradient shipped, so the first four milestones would never fire for them — and the Phase F proposal layer, ensuring every operator gets at least one explicit density choice through Phase F rather than implicit acceptance of a backfill default. The proposal copy reads: "Antaeus just added a setting for how much the system walks you through. Right now it's set to step back — that's how the product worked yesterday. Want to leave it that way, or try walked-through? You can switch any time."

The five milestones are independent. Each fires at most once per workspace. Each respects standard Phase F cooldown (dismiss = 30 days, snooze = 7 days). The milestone selection is intentionally conservative — these are observable signals of real fluency growth, not vanity events. A future v2 may add more (first autopsy run, first advisor deployment, first kit section ready) once the v1 data shows whether five milestones are enough or whether the operator wants more chances to switch.

### 2.5 Storage and persistence

The state lives in Supabase on `workspace_profile.density_state`. Migration `20260605000000_density_state.sql` adds the column with default `'show_me_how'` for new workspaces and `'step_back'` for any workspace that existed at the time of migration (the one-time backfill). The `data-client.ts` accessor exposes the read and the typed write. The Settings room and the Phase F proposal handler are the two write call sites.

Realtime sync (per the existing Supabase Realtime pattern in `src/lib/data-client.ts`) keeps the state consistent across tabs and devices for the same workspace. Changing density state in tab A updates the rendering in tab B within the realtime channel's latency window.

A subtle implementation note that matters for visual stability: components read `density_state` through a @preact/signals signal, which triggers a single re-render of affected components when the state changes rather than thrashing on every paint. The state changes infrequently (operator action or accepted proposal), and density-responsive components recompose their four-dimension rendering once per state change. No imperceptible animation between states — the surface re-renders in its target state on next paint after the state changes.

---

## Part III — The four dimensions, worked

The four dimensions are abstract until a component author writes against them. This part shows each dimension at work in a concrete component, both states rendered side by side.

### 3.1 Sentence count

A Dashboard command card surfaces the top-of-list ranked deal. The substance — what the deal is, why it ranks first, what the operator should do — is the same in both states. The verbosity differs.

**Show me how:**
> "The Acme deal hasn't moved in eighteen days. Sarah has been quiet since the demo on the fourteenth. This is what the system shows you first today because it is the ranked deal under the most pressure right now — pressure being a mix of how long the deal has been stalled, how big the deal is, and how late in the stage it should have moved by now. Click in to see the recovery options."

**Step back:**
> "Acme — stalled 18d at proposal. Recovery options inside."

Both pass the voice validator under the Command Chamber temperature. Both pair the rank with reasoning. Show me how spells out the reasoning across multiple sentences; Step back compresses the reasoning into a deal-state phrase the fluent operator reads at a glance. The component author writes both, declared via the `pickByDensity` helper as an object literal with `verbose` and `terse` properties:

```typescript
const cardCopy = pickByDensity({
  verbose: "The Acme deal hasn't moved in eighteen days. Sarah has been quiet since the demo on the fourteenth. This is what the system shows you first today because it is the ranked deal under the most pressure right now — pressure being a mix of how long the deal has been stalled, how big the deal is, and how late in the stage it should have moved by now. Click in to see the recovery options.",
  terse: "Acme — stalled 18d at proposal. Recovery options inside.",
});
```

The validator walks the object literal at build time, extracts both strings, and runs each through `validateString` independently. The renderer reads the workspace's density state at render time and returns the matching string.

### 3.2 Affordance count

A deal card in Deal Workspace surfaces the operator's options for this deal. In Show me how, all relevant actions are visible upfront so the operator does not have to learn which ones exist. In Step back, the primary action stays visible and the rest move into a More menu.

**Show me how affordances visible:** View, Edit, Mark at risk, Add note, Carry to advisor, Pre-mortem, Rehearse negotiation, Cast proof.

**Step back affordances visible:** View (primary), Edit (secondary), More (collapsed menu containing the other six actions).

The component author declares the affordance list with priority rankings. The renderer slices the list at index 2 for Step back and renders the rest behind More; Show me how renders the full list inline. The slice point is configurable per component (some surfaces need three visible actions in Step back, some need one), but the default of two is the rendering convention.

### 3.3 Default-expanded sections

A Future Autopsy pinned case carries four forensic sheets — pattern, proof, symptom, decision. In Show me how, all four are expanded so the operator sees the full structure of the autopsy at once and learns how the room organizes thinking. In Step back, only the highest-severity sheet is expanded by default; the others render as one-line collapsed headers carrying their state.

**Show me how:** Pattern (expanded), Proof (expanded), Symptom (expanded), Decision (expanded). Operator sees every sheet's substance immediately.

**Step back:** Pattern (collapsed — "Pressure before clarity — 3 prior cases match"), Proof (collapsed — "Proof never anchored — readout owner unset"), Symptom (expanded — the highest-severity sheet for this autopsy), Decision (collapsed — "Decision architecture unmapped").

The component author tags each section with a severity computed from the autopsy data. Step back expands the highest-severity tagged section and renders the others as collapsed headers carrying their state in one sentence. Show me how ignores severity tagging and renders all sections expanded.

### 3.4 Annotation density

An ICP Studio form gathers the seven inputs that produce an ICP definition. In Show me how, every input is accompanied by microcopy explaining what to enter and why; tooltips on hover for any non-obvious affordance. In Step back, microcopy disappears and tooltips are gone — the operator already knows what an ICP definition needs.

**Show me how:**
- Field label: "Buying group minimum"
- Microcopy under the field: "How many decision-makers typically have to agree before a deal closes? Most B2B teams find this is three to seven. The number you set here filters every Account downstream — accounts whose buying groups are smaller get deprioritized."
- Tooltip on the (?) icon: "Buying group minimum is one of the eight quality checks the ICP score uses."

**Step back:**
- Field label: "Buying group minimum"
- No microcopy.
- No tooltip.

The component author writes the microcopy and tooltip strings; the renderer hides them when the density state is `step_back`. Both states pass the voice validator — the microcopy strings are body prose per the voice spec's three-class taxonomy and undergo the full body-prose rule set.

### 3.5 What stays constant

Three things never change between Show me how and Step back, and the spec commits to keeping them constant. The voice itself stays constant (already pinned by voice-spec §4.3). The primitives stay constant — the same components render in both states, with the four-dimension responses adjusting how much of the primitive's render lands per state. The composition family temperature stays constant — a Live Instrument room speaks in Live Instrument temperature in both states, just with the four dimensions adjusted.

If a future change request proposes a different visual treatment or a different component for a given room across the two states, the request is asking for a different primitive, not for a density adjustment, and the spec routes the request back to the charter's mind-protection §4.4 rather than absorbing the request into the gradient.

---

## Part IV — The component contract

### 4.1 What a component declares

A density-responsive component declares one symbol in its module export: `densityResponsive: true`. The default is `false`, meaning the component renders one way regardless of state. A non-responsive component is the migration starting point for every existing room; the responsive flag flips per component as the migration audit (§5.1) brings each one up to standard.

A responsive component also declares which of the four dimensions it addresses. Some components only need sentence-count handling (a status chip rendering "Stalled 18d" vs "This deal has been stalled for eighteen days"). Some only need affordance-count handling (a toolbar). Some address all four (a major surface like a Dashboard command card or a Future Autopsy pinned case). The declaration is per dimension, typed as four booleans on a `densityDimensions` export.

### 4.2 How the component renders the two states

The four-dimension structure resolves the rendering approach for each dimension explicitly.

**Sentence count.** Components paired with verbose / terse content declare both string variants via the `pickByDensity({ verbose, terse })` helper introduced in §3.1. The validator walks the object literal at build time, extracts both strings, and runs each through `validateString` independently. The renderer reads the workspace's density state at runtime and returns the matching string. Components that only have one string (no verbose / terse split) render that one string in both states; calling `pickByDensity` is only required when paired content exists.

**Affordance count.** Components declaring an `affordances` array with priority ordering. The renderer slices at the configured index (default two) for Step back, surfaces the remainder behind a More menu, and renders the full list inline for Show me how.

**Default-expanded sections.** Components declaring sections with severity tagging. The renderer expands all sections in Show me how; in Step back, the renderer expands only the highest-severity section and renders the others as collapsed headers carrying their one-line state strings.

**Annotation density.** Components attaching microcopy via `tooltipText` and `microcopy` props on input and primitive elements. The renderer renders both in Show me how and hides them in Step back. No component-level branching required — the renderer handles the conditional rendering.

The shared rendering helpers live at `src/lib/density/` as a new module under the existing component infrastructure. The helpers compose with the voice-as-component module — `pickByDensity({ verbose, terse })` returns the string for the current density state, with both strings having already passed `validateString` at build time per the voice spec.

### 4.3 Inheritance and interaction with voice-as-component

The two specs compose orthogonally. The voice spec validates every string in every render; the density spec picks which strings to render and how much of the surface to show. A density-responsive component runs voice validation on both verbose and terse string variants — both must pass — and the renderer selects between them at runtime based on the workspace's density state. The validator does not know about density; the renderer does not modify the validator's rules.

The orthogonality also means migrating a room to density-responsive does not require re-running the voice audit. A room that already passes the voice validator at its current single-state shape will pass the voice validator after density migration as long as the new verbose and terse string variants both pass on their own. The density migration is additive — adding the second string variant where it does not exist, tagging the four-dimension elements where they do not exist, flipping the `densityResponsive` flag.

### 4.4 Onboarding — the floor of decompression

The Onboarding room (canon §4.3, Threshold family) is the most-walked-through surface in the system by design. It does not respond to the density gradient; it is always rendered in Show me how regardless of workspace state. The reasoning is structural: the day-one operator in Onboarding has not yet had the chance to declare a density preference, and the onboarding flow itself is the most explanatory walk the system ever does. Letting Onboarding respond to the gradient would create a paradox — an operator in Step back would land in Onboarding and be denied the walked-through experience the room exists to provide.

The onboarding-complete milestone fires the first Phase F proposal that asks the operator to declare their initial state for everything after Onboarding. Until that proposal lands, the workspace defaults to `show_me_how` and every density-responsive room renders walked-through. The proposal at the end of Onboarding is the operator's first chance to switch.

### 4.5 What this spec does not decide

Five things the spec deliberately defers rather than absorbs into the density mechanism.

**The visual surface where density proposals render outside the Briefing Suggestions section.** Density proposals fire through Phase F per §2.3. The Briefing Suggestions section per canon §4.21 is the existing Phase F render surface. Whether density proposals also render in the today-surface, the Dashboard, or other surfaces is a today-surface-spec decision rather than a density-spec decision.

**The per-room severity computation that determines which section is default-expanded in Step back.** §3.3 says components declare sections with severity tagging and the renderer expands the highest-severity one in Step back. The computation that produces the severity score is per-room logic — a Future Autopsy pinned case computes severity from autopsy data; a Deal Workspace card computes severity from deal pressure; an Outbound Studio surface computes severity from signal heat. The density spec specifies the contract; the rooms specify the computation.

**The slice index override mechanism for affordance count.** §3.2 names the default slice point as two and calls it configurable per component. The exact override syntax — whether it lives as an `affordanceSliceIndex` prop on the component declaration, a constructor argument, or a context-aware default — is implementation discretion the component library spec will resolve rather than the density spec.

**The visual transition between states when an operator switches.** §2.5 commits to no imperceptible animation — the surface re-renders in its target state on next paint. Whether the re-render itself uses any visual signal (a brief loading state, a fade, nothing at all) is a motion-language-spec decision the design system will resolve later.

**Multi-operator workspace semantics.** The spec is single-operator throughout — the workspace has one density state for one operator, stored at the workspace level. Multi-operator workspaces are not a current canon thing (canon Part II §1 names the founder-to-first-operator scope). If multi-operator support lands later, the spec will need to decide whether density is per-workspace or per-operator-per-workspace. The deferred answer is per-operator-per-workspace (each operator picks their own density inside a shared workspace), but the spec does not lock that today.

---

## Part V — Migration, citations, signals

### 5.1 Migration of the 22 existing rooms

The migration plan follows the same shape as the voice spec's per-room queue, with one structural simplification: density-responsive support is opt-in per component, so existing rooms render in their current shape until each component opts in. There is no flag like `voice_validator_enforce_mode` because there is nothing to enforce against — a non-responsive component is valid and ships as-is.

The migration steps are:

1. Land the density infrastructure: the Supabase migration adding `workspace_profile.density_state`, the `src/lib/density/` module with the four-dimension helpers, the Settings toggle, and the Phase F proposal handler.
2. Run the existing-workspace backfill setting `density_state = 'step_back'` for every workspace that exists at the migration date.
3. Ship the gradient-available Phase F proposal to existing operators on next login (per §2.4's fifth milestone). This replaces the older draft of a one-time in-app notice — the Phase F mechanism does the same job through the established proposal surface, ensures existing operators get an explicit choice rather than an implicit backfill, and keeps the density decision routed through the same accept/dismiss/snooze path as every other Phase F proposal.
4. Migrate rooms one at a time, smallest first, adding the four-dimension responses per component. Each migration is its own pull request with the room's component contract documenting which dimensions it addresses and why.
5. After all rooms migrate, the migration is structurally complete — the gradient is fully active across the product and every operator-facing surface respects the state.

The migration does not have a flag-flip moment the way the voice spec does. Each component flipping its `densityResponsive` flag is its own incremental commitment. The system reaches "the gradient is active" when the founder and the design team agree that the migration queue has cleared, which is signal #3 in §5.3.

### 5.2 Behavioral citations

Per charter §3.3, every component spec maps its behavioral mechanism to at least one principle from canon Part III §5 and reproduces the principle's research citation. Density gradient implements four principles.

**Cognitive Load Theory (Tier 1, Sweller 1988).** Show me how reduces extraneous load for the day-one operator by surfacing explanations the operator needs to understand what they are looking at. Step back reduces extraneous load for the fluent operator who would be over-explained by walked-through surfaces and would have to filter past the explanations to get to the substance. The same principle justifies both states for different operator realities.

**Endowed Progress Effect (Tier 2, Nunes & Dreze 2006).** The 82% completion lift when "not started" converts to "underway" immediately is what the milestone-triggered proposals serve. The operator who closes their first deal is no longer a stranger; the proposal acknowledges that and offers the option to operate denser surfaces. The proposal converts an implicit fluency gain into a visible operating choice.

**Self-Determination Theory (Tier 3, Deci & Ryan 2000).** The competence-affirming framing of the proposal — "You closed your first deal last week. Want me to step back?" — surfaces real progress without flattery. The accept-or-dismiss agency boundary preserves autonomy. The operator is in charge of their density state at every moment.

**Implementation Intentions (Tier 1, Gollwitzer 1999, d = 0.65 across 94 studies and 8,000+ participants).** The five milestone triggers are if-then specific moments rather than generic "do you want to change settings" prompts. The proposal lands at a contextually grounded point — right after the operator demonstrated the behavior the proposal is acknowledging, or in the gradient-available case at the moment the option first becomes available — which is the implementation-intention shape the canon Tier-1 evidence supports as the highest-effect framing.

The spec is graded against charter Test 1 (selectivity-defensible) — the gradient makes selectivity work for operators at different fluency levels without either over-explaining to Sarah or under-explaining to the day-one operator. The same selectivity, defended in plain language, lands legibly for both. It supports Test 2 (truth-loyalty) by the discipline that Show me how does not soften truths to make them more digestible; the four-dimension structure does not adjust which truths land, only how much surface the truths get rendered against.

### 5.3 Signals the spec is doing its job

Four signals together tell us the density gradient is working.

**The day-one operator stays.** A new user opens Antaeus, sees Show me how surfaces walking them through what each primitive is and what to do next, and reaches their first meaningful operating action without bouncing. The signal is that day-one operator activation rates measured in Posthog do not show a "first wall hit" where the operator opens a non-onboarding room and immediately leaves; instead the walked-through surfaces carry the operator forward through their first Dashboard glance, their first Signal Console review, their first deal entry.

**The fluent operator stays fast.** A workspace running in Step back stays in Step back — operators who switch do not switch back. The signal is that the Phase F dismiss-then-revert rate is low (operators who pick Step back keep Step back), and the Settings toggle does not show frequent state oscillation. Fluent operators are getting what they need from the dense surfaces; the system is staying out of their way.

**The migration completes and stays complete.** The 22-room migration queue clears at a sustainable cadence, and every operator-facing surface in production respects the density state at the moment it renders. The signal is that every density-responsive component declares its four dimensions correctly and renders both states cleanly, with the founder and the design team agreeing the migration queue has cleared.

**Subsequent specs inherit the density gradient cleanly.** The component library spec, the today-surface spec, and every later sibling document declare `voiceFamily` and `densityResponsive` and route their strings through `pickByDensity` without renegotiating the rules. The signal is that no later spec proposes a parallel density mechanism, no room asks for an exception from the four-dimension contract, and the gradient becomes the floor every later surface inherits from rather than the question every surface tries to re-litigate.

---

## Closing

This spec is the second sibling document under the design system charter. It commits the operating mechanism for the gradient promise the charter pinned and the voice spec preserved as orthogonal. After it lands, the same primitives serve the day-one operator and the fluent operator without forking into two products — two states, four dimensions, one per-workspace setting, Phase F-style proposals at named milestones, voice unchanged across both.

The next sibling document is the component library. The library inherits the voice spec's three-class taxonomy and the density spec's four-dimension structure as built-in defaults — every primitive the library ships declares its voice family and its density-responsive dimensions at the call site, and the validator and the renderer handle the rest. The today-surface spec, the iconography direction, the motion language, and the brand-identity charter follow in the order the charter named.

---

*Citations: design system charter (`00-charter-2026-06-02.md`) — §0 (scope), §1.2 (Test 1 selectivity-defensible + Test 2 truth-loyalty), §2.1 (memory and continuity property, agency boundary property), §3.3 (component-citation discipline), §3.6 (rubric ladder), §4.3 (existing-rooms migration), §4.4 (mind-correction protocol), §4.7 (Sarah-day-90 density baseline). Voice-as-component spec (`01-voice-as-component-2026-06-04.md`) — §2.1 (three string classes), §4.3 (voice constant across density). Behavioral canon `CLAUDE.md` Part III §5 (Cognitive Load Theory, Endowed Progress Effect, Self-Determination Theory, Implementation Intentions), Part II.5 §7 (orchestration layer + Phase F proposal pattern). Room references: canon §4.3 (Onboarding, Threshold family), §4.12 (Discovery Studio), §4.13 (Deal Workspace), §4.15 (PoC Framework — first proof cast), §4.21 (Briefing — Phase F proposal surface).*
