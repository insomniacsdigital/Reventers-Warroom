import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/generated/prisma/enums";

const COOKIE = "wr_session";
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  name: string;
  appRole: AppRole;
  isAdmin: boolean;
  mustChangePassword: boolean;
  /** Cohorts this person leads. */
  cohortIds: string[];
  /** IPs this person is IP CS for. */
  ipcsIpIds: string[];
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(personId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), personId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}

/** The signed-in person for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      person: {
        include: {
          leadsCohorts: { select: { id: true } },
          assignments: { where: { role: "IP_CS" }, select: { ipId: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.person.active) return null;
  const p = session.person;
  return {
    id: p.id,
    name: p.name,
    appRole: p.appRole,
    isAdmin: p.appRole === "ADMIN",
    mustChangePassword: p.mustChangePassword,
    cohortIds: p.leadsCohorts.map((c) => c.id),
    ipcsIpIds: p.assignments.map((a) => a.ipId),
  };
});

/** For pages: send signed-out visitors to the sign-in page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/account/password");
  return user;
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

/** For server actions: throw instead of redirecting. */
export async function actionUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) throw new Error("Please sign in again.");
  return user;
}

export async function actionAdmin(): Promise<CurrentUser> {
  const user = await actionUser();
  if (!user.isAdmin) throw new Error("Only admins can do that.");
  return user;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  ADMIN: "Admin",
  COHORT_LEADER: "Cohort Leader",
  IP_CS: "IP CS",
  DESIGNER: "Designer",
  EDITOR: "Editor",
  FLOATER: "Floater",
};
