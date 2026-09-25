import { SignJWT, jwtVerify } from "jose";
import { UserRole, type User } from "@/contracts";

export const SESSION_COOKIE = "fnet_session";
export const SESSION_SECONDS = 60 * 30;

type SessionClaims = {
  sub: string;
  email: string;
  name: string;
  role: User["role"];
  technicianId: string | null;
  coordinatorId: string | null;
};

function secretKey(): Uint8Array {
  const value = process.env.AUTH_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  return new TextEncoder().encode(value);
}

function validRole(value: unknown): value is User["role"] {
  return value === UserRole.ADMIN || value === UserRole.COORDINATOR || value === UserRole.MANAGER || value === UserRole.TECHNICIAN;
}

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    technicianId: user.technicianId,
    coordinatorId: user.coordinatorId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string" || !validRole(payload.role)) return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      technicianId: typeof payload.technicianId === "string" ? payload.technicianId : null,
      coordinatorId: typeof payload.coordinatorId === "string" ? payload.coordinatorId : null,
    };
  } catch {
    return null;
  }
}

export function databaseUserToContract(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  technicianId: string | null;
  coordinatorId: string | null;
  active: boolean;
}): User {
  if (!validRole(row.role)) throw new Error("INVALID_USER_ROLE");
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    technicianId: row.technicianId,
    coordinatorId: row.coordinatorId,
    active: row.active,
  };
}
