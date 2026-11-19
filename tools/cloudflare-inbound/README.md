# GEM inbound on Cloudflare (replaces Postmark)

The Power Automate relays and the Sales Navigator alert rule mail copies to
`relay@gem.antaeus.app`. Cloudflare Email Routing hands each email to the
Worker in `gem-inbound-worker.js`, which unpacks it and posts it to GEM's
`/inbound/salesnav` route in the shape Postmark posted: From, To, Cc,
Subject, Date, TextBody, HtmlBody, and any attached .eml or .msg as
Attachments. The route needs no change.

- `worker.js` is the source. `gem-inbound-worker.js` is the same program with
  its one library (postal-mime 2) bundled in, so it pastes into the
  Cloudflare dashboard editor as a single file. Rebuild it with
  `npx esbuild worker.js --bundle --format=esm --platform=neutral
  --main-fields=module,main --outfile=gem-inbound-worker.js` after
  `npm i postal-mime@2`.
- The Worker reads two settings: `GEM_URL` (text) and `GEM_SECRET` (secret,
  the same value the Postmark webhook carried after `?key=`).
- Delivery (2026-11-19, after the Codex review on #433): a network failure or
  a 5xx from GEM is retried, three tries in all, two and four seconds apart.
  When the third try fails, or GEM refuses the email outright (any other
  non-2xx, such as 401 for a wrong secret or 413 for too large), the Worker
  rejects the message, so the sender, the operator's own Outlook, receives a
  bounce saying GEM could not take it. Nothing is dropped silently. Tested
  with stubs: network errors (3 tries, bounce), 503 three times (3 tries,
  bounce), 401 (1 try, bounce), 200 (no bounce), one 500 then 200 (2 tries,
  no bounce).
- After changing `worker.js`, rebuild the bundle and paste it into the
  `gem-inbound` Worker in Cloudflare (Edit code, select all, paste, Deploy):
  the repository copy does not deploy itself.
- Tested 2026-11-18: a quoted-printable HTML relay with an encoded subject
  reads as a `[GW-SENT]` copy through `relayedCopy`, and a forwarded alert
  arrives whole through `messageAttachments`.
