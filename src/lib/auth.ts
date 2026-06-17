import { UserRole, type User } from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      status: "pending";
      appUser: User;
      authEmail: string;
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

function displayName(email: string, metadata: Record<string, unknown> | undefined) {
  const metadataName =
    typeof metadata?.["full_name"] === "string"
      ? metadata["full_name"]
      : typeof metadata?.["name"] === "string"
        ? metadata["name"]
        : undefined;

  return metadataName ?? email.split("@")[0] ?? email;
}

function bootstrapOwnerEmails() {
  return new Set(
    (process.env["APP_BOOTSTRAP_OWNER_EMAILS"] ?? "")
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter(Boolean),
  );
}

export async function getAppAccess(): Promise<AppAccess> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser?.email) {
    return {
      appUser: null,
      authEmail: null,
      canRead: false,
      canWrite: false,
      message: "Sign in to continue.",
      status: "unauthenticated",
    };
  }

  const email = normalizeEmail(authUser.email);

  if (!hasDatabaseEnv()) {
    return {
      appUser: null,
      authEmail: email,
      canRead: false,
      canWrite: false,
      message: "Database environment variables are required for access checks.",
      status: "database-unavailable",
    };
  }

  const prisma = getPrisma();
  const bootstrapOwner = bootstrapOwnerEmails().has(email);
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        {
          authUserId: authUser.id,
        },
        {
          email,
        },
      ],
    },
  });
  const appUser = existing
    ? await prisma.user.update({
        data: {
          authUserId: existing.authUserId ?? authUser.id,
          isActive: bootstrapOwner ? true : existing.isActive,
          lastSignedInAt: new Date(),
          name: existing.name || displayName(email, authUser.user_metadata),
          role: bootstrapOwner ? UserRole.OWNER : existing.role,
        },
        where: {
          id: existing.id,
        },
      })
    : await prisma.user.create({
        data: {
          authUserId: authUser.id,
          email,
          isActive: bootstrapOwner,
          isCanonOwner: bootstrapOwner,
          isProductOwner: bootstrapOwner,
          lastSignedInAt: new Date(),
          name: displayName(email, authUser.user_metadata),
          role: bootstrapOwner ? UserRole.OWNER : UserRole.VIEWER,
        },
      });

  if (!appUser.isActive) {
    return {
      appUser,
      authEmail: email,
      canRead: false,
      canWrite: false,
      message: "Your account is signed in but not active for this workspace yet.",
      status: "pending",
    };
  }

  return {
    appUser,
    authEmail: email,
    canRead: true,
    canWrite: appUser.role === UserRole.OWNER,
    message: "Access granted.",
    status: "active",
  };
}
