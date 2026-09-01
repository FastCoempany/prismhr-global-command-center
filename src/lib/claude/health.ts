// The key-health latch (founder-decreed 2026-08-22): the app's instinct is
// always the API — but a key that is configured yet DEAD (invalid, or out
// of credits) must not leave surfaces paying doomed calls or stalling. The
// first call that fails with an auth or billing error flips this latch, and
// every availability gate app-wide reads it: the whole app immediately
// behaves as keyless and takes its fallbacks. Any successful call clears
// the latch, and it expires on its own — so a refilled balance or a fixed
// key picks back up without anyone touching anything.
//
// The latch lives in instance memory: a warm serverless instance remembers,
// a cold one pays one fast doomed call and re-learns. Transient failures
// (rate limits, overload, timeouts) never latch — only the errors that mean
// the key itself cannot work.

import Anthropic from "@anthropic-ai/sdk";

const DOWN_WINDOW_MS = 10 * 60_000;
let downAt = 0;

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function claudeDead(): boolean {
  return downAt > 0 && Date.now() - downAt < DOWN_WINDOW_MS;
}

/** The one gate every *Available() reads: a key is configured AND no recent
 *  call has proven it dead. */
export function claudeAvailable(): boolean {
  return claudeConfigured() && !claudeDead();
}

export function markClaudeDown(): void {
  downAt = Date.now();
}

export function markClaudeUp(): void {
  downAt = 0;
}

const CREDIT_RE = /credit balance|billing|insufficient credit/i;

/** A misconfigured identity-linked key fails every call the same way. It is a
 *  400, not a 401, so without this it read as transient and the run retried a
 *  doomed call for every account instead of saying the thing out loud. */
const WORKSPACE_RE = /anthropic-workspace-id is required/i;

/** Classify an error already thrown by a call: latch when it means the key
 *  is dead, leave transient trouble alone. Returns whether it latched. */
export function noteClaudeFailure(e: unknown): boolean {
  const status = (e as { status?: number })?.status;
  const msg = String((e as Error)?.message ?? e ?? "");
  const dead =
    status === 401 ||
    status === 403 ||
    /invalid x-api-key|authentication_error/i.test(msg) ||
    CREDIT_RE.test(msg) ||
    WORKSPACE_RE.test(msg);
  if (dead) markClaudeDown();
  return dead;
}

/** The instrumented fetch: watches every response so no call site needs its
 *  own bookkeeping. 401/403 latch; a 400 whose body names the credit
 *  balance latches; any 2xx clears. */
const watchedFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  if (res.status === 401 || res.status === 403) markClaudeDown();
  else if (res.status === 400) {
    try {
      const body = await res.clone().text();
      if (CREDIT_RE.test(body) || WORKSPACE_RE.test(body)) markClaudeDown();
    } catch {
      // an unreadable body stays unclassified
    }
  } else if (res.ok) markClaudeUp();
  return res;
};

// An IDENTITY-LINKED key does not name its own workspace: the API refuses the
// call with "anthropic-workspace-id is required when authenticating with an
// identity-linked API key". Before that message existed to read, the same
// condition surfaced as "your credit balance is too low" — which cost the
// operator an evening chasing billing while his credits sat funded and
// reachable (2026-09-01). Set ANTHROPIC_WORKSPACE_ID and every call carries
// the header; leave it unset and a classic workspace key behaves exactly as
// before, since the header is only added when the value exists.
export function workspaceHeaders(): Record<string, string> {
  const id = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return id ? { "anthropic-workspace-id": id } : {};
}

/** Drop-in for `new Anthropic(...)`: same options, health-instrumented. */
export function claudeClient(
  opts?: ConstructorParameters<typeof Anthropic>[0],
): Anthropic {
  return new Anthropic({
    ...opts,
    fetch: watchedFetch,
    // A caller's own headers win — this fills the workspace in, never over.
    defaultHeaders: { ...workspaceHeaders(), ...(opts?.defaultHeaders ?? {}) },
  });
}
