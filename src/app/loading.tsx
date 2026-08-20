// The instant answer to every tab click (founder-decreed 2026-08-20): the
// rooms derive everything per request and can take seconds to compose — the
// click must speak NOW. One quiet line in the brand's own voice, shown by
// the router the moment navigation starts, replaced by the room when it
// arrives.

export default function Loading() {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-donor-mono), ui-monospace, Menlo, monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.22em",
          color: "rgba(10, 28, 64, 0.42)",
        }}
      >
        THE ROOM IS COMPOSING…
      </span>
    </main>
  );
}
