import { afterEach, describe, expect, it } from "vitest";
import { UserRole, type User } from "@/contracts";
import { createSessionToken, databaseUserToContract, verifySessionToken } from "./auth";

const previousSecret = process.env.AUTH_SECRET;

afterEach(() => {
  if (previousSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = previousSecret;
});

describe("auth session", () => {
  it("signs and verifies the assigned role", async () => {
    process.env.AUTH_SECRET = "test-secret-with-at-least-thirty-two-characters";
    const user: User = {
      id: "user-1",
      email: "euge@fnet.local",
      name: "Euge",
      role: UserRole.ADMIN,
      technicianId: null,
      coordinatorId: null,
      active: true,
    };

    const claims = await verifySessionToken(await createSessionToken(user));
    expect(claims).toMatchObject({ sub: "user-1", email: "euge@fnet.local", role: UserRole.ADMIN });
  });

  it("rejects a token signed with a different secret", async () => {
    process.env.AUTH_SECRET = "first-secret-with-at-least-thirty-two-characters";
    const token = await createSessionToken({
      id: "user-1",
      email: "euge@fnet.local",
      name: "Euge",
      role: UserRole.ADMIN,
      technicianId: null,
      coordinatorId: null,
      active: true,
    });
    process.env.AUTH_SECRET = "second-secret-with-at-least-thirty-two-characters";
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects unknown database roles", () => {
    expect(() => databaseUserToContract({ id: "x", email: "x@fnet.local", name: "X", role: "OWNER", technicianId: null, coordinatorId: null, active: true })).toThrow("INVALID_USER_ROLE");
  });
});
