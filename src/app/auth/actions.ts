"use server";

import { redirect } from "next/navigation";
import { clearAccessSession, isValidAccessCode, setAccessSession } from "@/lib/auth";

function required(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function safeNext(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

function loginRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  redirect(`/login?${searchParams.toString()}`);
}

export async function signIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const code = required(formData, "code");

  if (!isValidAccessCode(code)) {
    loginRedirect({
      error: "That access code is not valid.",
      next,
    });
  }

  await setAccessSession();
  redirect(next);
}

export async function signOut() {
  await clearAccessSession();
  redirect("/login");
}
