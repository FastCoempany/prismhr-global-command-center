// The Channel Ask's steps — pure, so the instrument (a client component) and
// the suite read one machine (the Sendbook, decreed 2026-08-19). Worked-it
// springs a chip row: the primary channels, then the rest behind ···. One
// tap names the channel; a second row asks who only when the merged set of
// names holds more than one (C18). Each row carries ✕, which closes it and
// files nothing. Outcomes are never asked: no step here asks how it went.

import { CHANNELS, type Channel } from "./read";

/** The first row, in the decree's order. */
export const ASK_PRIMARY: readonly Channel[] = CHANNELS.slice(0, 6);
/** Behind ···, in the decree's order. */
export const ASK_MORE: readonly Channel[] = CHANNELS.slice(6);

export type AskState = {
  stage: "idle" | "channel" | "contact";
  more: boolean;
  channel: string;
};

export const ASK_IDLE: AskState = { stage: "idle", more: false, channel: "" };

export type AskEvent =
  | { kind: "open" }
  | { kind: "more" }
  | { kind: "pick"; channel: string }
  | { kind: "who"; name: string }
  | { kind: "skip" }
  | { kind: "close" };

/** One step: the next state, and the tap to file when the step files one.
 *  Filing leaves the row as it is; the stamp moves the stage on. */
export function askStep(
  state: AskState,
  event: AskEvent,
  contacts: readonly string[],
): { state: AskState; file: { channel: string; who: string } | null } {
  switch (event.kind) {
    case "open":
      return state.stage === "idle"
        ? { state: { ...ASK_IDLE, stage: "channel" }, file: null }
        : { state, file: null };
    case "more":
      return state.stage === "channel"
        ? { state: { ...state, more: true }, file: null }
        : { state, file: null };
    case "pick":
      if (state.stage !== "channel") return { state, file: null };
      if (contacts.length > 1)
        return {
          state: { ...state, stage: "contact", channel: event.channel },
          file: null,
        };
      return { state, file: { channel: event.channel, who: contacts[0] ?? "" } };
    case "who":
      return state.stage === "contact"
        ? { state, file: { channel: state.channel, who: event.name } }
        : { state, file: null };
    case "skip":
      return state.stage === "contact"
        ? { state, file: { channel: state.channel, who: "" } }
        : { state, file: null };
    case "close":
      return { state: ASK_IDLE, file: null };
  }
}
