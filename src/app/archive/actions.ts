"use server";

// Archive actions — restore from the hidden bin, reopen a done note, or
// delete forever (the only place a real delete lives, on purpose).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { splitMarker, splitTags, withMarker, withTags } from "@/lib/today/route-notes";

function str(fd: FormData, key: string, max = 300) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

function back() {
  revalidatePath("/archive");
  revalidatePath("/today");
  redirect("/archive");
}

// Un-hide: drop the hide: disposition; the item reappears wherever it lives.
export async function restoreHidden(formData: FormData) {
  const key = str(formData, "key", 191);
  if (!(await requireWrite()) || !key.startsWith("hide:")) back();
  try {
    await getPrisma().accountDisposition.deleteMany({ where: { accountId: key } });
  } catch {
    // table missing — nothing to restore
  }
  back();
}

// Reopen a ✓-checked sheet note — back to the Day Sheet as an open note.
export async function reopenTodo(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) back();
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (t) {
      const { text, refs, label } = splitMarker(t.body);
      const { text: plain, tags } = splitTags(text);
      const tagged = withTags(plain, { ...tags, doneAt: "" });
      await prisma.todo.update({
        where: { id },
        data: { body: refs ? withMarker(tagged, refs, label) : tagged, done: false },
      });
    }
  } catch {
    // degrade silently
  }
  back();
}

// Delete forever — only offered here, and only for hidden items.
export async function deleteForever(formData: FormData) {
  const key = str(formData, "key", 191);
  if (!(await requireWrite()) || !key.startsWith("hide:")) back();
  const [, store, rest] = key.split(":", 3);
  try {
    const prisma = getPrisma();
    if (store === "todo") {
      await prisma.todo.deleteMany({ where: { id: rest } });
    } else if (store === "acct") {
      await prisma.accountNote.deleteMany({ where: { id: rest } });
    } else if (store === "partner") {
      await prisma.partnerNote.deleteMany({ where: { id: rest } });
    } else if (store === "touchLog") {
      const [subjectKey, at] = rest.split("|");
      const t = await prisma.touch.findUnique({ where: { subjectKey } });
      if (t) {
        const log = (Array.isArray(t.log) ? t.log : []).filter(
          (e) => !(e && typeof e === "object" && (e as { at?: string }).at === at),
        );
        await prisma.touch.update({
          where: { subjectKey },
          data: { log: log as object[] },
        });
      }
    }
    await prisma.accountDisposition.deleteMany({ where: { accountId: key } });
  } catch {
    // degrade silently
  }
  back();
}
