// GEM inbound relay on Cloudflare Email Routing.
// Each email that reaches this address is unpacked and posted to GEM's
// inbound route in the shape Postmark posts: From, To, Cc, Subject, Date,
// TextBody, HtmlBody, and any attached .eml or .msg as Attachments.
// Settings (Worker → Settings → Variables and Secrets):
//   GEM_URL     the route, e.g. https://prismhr-global-command-center.vercel.app/inbound/salesnav
//   GEM_SECRET  the inbound secret (stored as a Secret, never as plain text)
import PostalMime from "postal-mime";

const addr = (a) => (!a ? "" : a.name ? `${a.name} <${a.address}>` : a.address || "");
const list = (xs) => (xs || []).map(addr).filter(Boolean).join(", ");
const b64 = (u8) => {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000)
    s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
};

export async function toPost(raw) {
  const m = await PostalMime.parse(raw);
  const attachments = (m.attachments || [])
    .filter(
      (a) =>
        /message\/rfc822|vnd\.ms-outlook/i.test(a.mimeType || "") ||
        /\.(eml|msg)$/i.test(a.filename || ""),
    )
    .slice(0, 60)
    .map((a) => ({
      Name: a.filename || (/outlook/i.test(a.mimeType) ? "attached.msg" : "attached.eml"),
      ContentType: a.mimeType || "message/rfc822",
      Content: b64(
        new Uint8Array(
          typeof a.content === "string" ? new TextEncoder().encode(a.content) : a.content,
        ),
      ),
    }));
  return {
    From: addr(m.from),
    To: list(m.to),
    Cc: list(m.cc),
    Subject: m.subject || "",
    Date: m.date || "",
    TextBody: m.text || "",
    HtmlBody: m.html || "",
    Attachments: attachments,
  };
}

const worker = {
  async email(message, env) {
    const raw = await new Response(message.raw).arrayBuffer();
    const body = JSON.stringify(await toPost(raw));
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(env.GEM_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env.GEM_SECRET}`,
        },
        body,
      });
      if (r.ok || r.status < 500) {
        console.log("GEM answered", r.status, (await r.text()).slice(0, 200));
        return;
      }
      await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
    }
    console.log("GEM did not take the email after three tries");
  },
};

export default worker;
