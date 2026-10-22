// The attachment door: one file the stage's Send in Outlook carries
// (src/lib/collateral/attachments.ts), a piece at a time. A plain GET for
// the signed-in only, never a server action. A function's response tops out
// at 4.5 MB on Vercel and a demo runs near 5 MB, so the browser asks for
// ?part=0, 1, … until x-attach-parts says it has them all, and builds the
// Outlook draft itself.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getAppAccess } from "@/lib/auth";
import { ATTACH_PIECE_BYTES, attachmentById } from "@/lib/collateral/attachments";

export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await getAppAccess().catch(() => null);
  if (access?.status !== "active")
    return NextResponse.json({ ok: false }, { status: 401, headers: noStore });

  const { id } = await ctx.params;
  const file = attachmentById(id);
  if (!file) return NextResponse.json({ ok: false }, { status: 404, headers: noStore });

  const part = Number(new URL(req.url).searchParams.get("part") ?? "0");
  const parts = Math.max(1, Math.ceil(file.bytes / ATTACH_PIECE_BYTES));
  if (!Number.isInteger(part) || part < 0 || part >= parts)
    return NextResponse.json({ ok: false }, { status: 400, headers: noStore });

  let bytes: Buffer;
  try {
    bytes = await readFile(join(process.cwd(), file.path));
  } catch {
    return NextResponse.json({ ok: false }, { status: 404, headers: noStore });
  }
  const piece = bytes.subarray(
    part * ATTACH_PIECE_BYTES,
    (part + 1) * ATTACH_PIECE_BYTES,
  );
  return new Response(new Uint8Array(piece), {
    headers: {
      ...noStore,
      "content-type": "application/octet-stream",
      "x-attach-parts": String(parts),
      "x-attach-bytes": String(bytes.length),
    },
  });
}
