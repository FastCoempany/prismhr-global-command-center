import crypto from "node:crypto";
import { cookies } from "next/headers";
import { UserRole, type User } from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
// ⚠ TEMPORARY: site is PUBLIC while this flag is true — anyone with the URL
// gets full owner access (view + edit), and the edge proxy skips its cookie
// gate too. One flip in src/lib/public-access.ts restores the private gate.
import { PUBLIC_ACCESS } from "@/lib/public-access";

export const ACCESS_COOKIE_NAME = "field_signal_access";

const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 12;
const ACCESS_COOKIE_MAX_AGE_MS = ACCESS_COOKIE_MAX_AGE * 1000;
const FALLBACK_OWNER_EMAIL = "antaeus@example.local";

export type AppAccess =
  | {
      status: "unauthenticated";
      appUser: null;
      authEmail: null;
      canRead: false;
      canWrite: false;
      message: string;
    }
  | {
      status: "database-unavailable";
      appUser: null;
      authEmail: string | null;
      canRead: false;
      canWrite: false;
      message: string;
    }
  | {
      status: "active";
      appUser: User;
      authEmail: string;
      canRead: true;
      canWrite: boolean;
      message: string;
    };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function accessCode() {
  return process.env["APP_ACCESS_CODE"]?.trim() || undefined;
}

function cookieSecret() {
  return process.env["APP_AUTH_COOKIE_SECRET"]?.trim() || accessCode();
}

function ownerEmail() {
  return normalizeEmail(process.env["APP_ACCESS_USER_EMAIL"] ?? FALLBACK_OWNER_EMAIL);
}

function safeEqual(a: string, b: string) {
  const aHash = crypto.createHash("sha256").update(a).digest();
  const bHash = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

function signSessionPayload(payload: string) {
  const secret = cookieSecret();

  if (!secret) {
    throw new Error("APP_ACCESS_CODE or APP_AUTH_COOKIE_SECRET is required.");
  }

  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function createAccessToken() {
  const issuedAt = Date.now().toString();
  const signature = signSessionPayload(issuedAt);
  return `${issuedAt}.${signature}`;
}

function isValidAccessToken(token: string | undefined) {
  if (!token) return false;

  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) return false;
  if (Date.now() - issuedAtMs > ACCESS_COOKIE_MAX_AGE_MS) return false;

  try {
    return safeEqual(signature, signSessionPayload(issuedAt));
  } catch {
    return false;
  }
}

export function hasAccessCookieValue(value: string | undefined) {
  return isValidAccessToken(value);
}

export function isValidAccessCode(input: string) {
  const expected = accessCode();
  if (!expected) return false;
  return safeEqual(input.trim(), expected);
}

export async function setAccessSession() {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_COOKIE_NAME, createAccessToken(), {
    httpOnly: true,
    maxAge: ACCESS_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
  });
}

export async function clearAccessSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE_NAME);
}

export async function hasAccessSession() {
  const cookieStore = await cookies();
  return isValidAccessToken(cookieStore.get(ACCESS_COOKIE_NAME)?.value);
}

export async function getAppAccess(): Promise<AppAccess> {
  // When public, skip the cookie gate entirely — everyone is treated as the
  // signed-in owner (full read + write) and no login screen is shown.
  if (!PUBLIC_ACCESS && !(await hasAccessSession())) {
    return {
      appUser: null,
      authEmail: null,
      canRead: false,
      canWrite: false,
      message: "Enter the access code to continue.",
      status: "unauthenticated",
    };
  }

  const email = ownerEmail();

  if (!hasDatabaseEnv()) {
    return {
      appUser: null,
      authEmail: email,
      canRead: false,
      canWrite: false,
      message: "Access checks are unavailable right now.",
      status: "database-unavailable",
    };
  }

  const prisma = getPrisma();
  const appUser = await prisma.user.upsert({
    create: {
      email,
      isActive: true,
      isCanonOwner: true,
      isProductOwner: true,
      lastSignedInAt: new Date(),
      name: "Antaeus",
      role: UserRole.OWNER,
    },
    update: {
      isActive: true,
      lastSignedInAt: new Date(),
      role: UserRole.OWNER,
    },
    where: {
      email,
    },
  });

  return {
    appUser,
    authEmail: email,
    canRead: true,
    canWrite: appUser.role === UserRole.OWNER,
    message: "Access granted.",
    status: "active",
  };
}
