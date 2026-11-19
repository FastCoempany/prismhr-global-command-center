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
- A failed post is retried three times; anything GEM refuses (4xx) is logged
  and dropped, so the sender never gets a bounce.
- Tested 2026-11-18: a quoted-printable HTML relay with an encoded subject
  reads as a `[GW-SENT]` copy through `relayedCopy`, and a forwarded alert
  arrives whole through `messageAttachments`.
