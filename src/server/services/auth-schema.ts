import { hash } from "bcryptjs";
import { getPrismaClient } from "@/server/prisma";

export async function ensureBootstrapAdmin(): Promise<void> {
  const prisma = getPrismaClient();
  if (await prisma.app_users.count({ where: { role: "ADMIN" } })) return;

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Administradora FNET";
  if (!email || !password || password.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_NOT_CONFIGURED");
  }
  if (await prisma.app_users.findUnique({ where: { email } })) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL_ALREADY_IN_USE");
  }

  await prisma.app_users.create({
    data: {
      email,
      name,
      passwordHash: await hash(password, 12),
      role: "ADMIN",
      active: true,
    },
  });
}
