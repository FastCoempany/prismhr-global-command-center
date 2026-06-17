"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function required(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function safeNext(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/prospect-field";
  }
  return value;
}

function loginRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  redirect(`/login?${searchParams.toString()}`);
}

export async function signIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const email = required(formData, "email").toLowerCase();
  const password = required(formData, "password");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginRedirect({
      error: "Sign in failed. Check the email and password.",
      next,
    });
  }

  redirect(next);
}

export async function requestAccess(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const email = required(formData, "email").toLowerCase();
  const password = required(formData, "password");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    loginRedirect({
      error: "Access request failed. Use a stronger password or sign in instead.",
      next,
    });
  }

  loginRedirect({
    notice:
      "Access requested. Sign in after confirmation; workspace activation is still required.",
    next,
  });
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
