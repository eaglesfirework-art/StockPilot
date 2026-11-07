// From scratch: empty the TEST database and create only the very first admin (someone has to log in).
// Everything else (workers, items, vendors, entries) is created through the screens by the specs.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ADMIN } from "./helpers";

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL!;
  if (!/test/i.test(url)) throw new Error("Refusing to wipe a database whose name does not contain 'test'");
  const db = new PrismaClient({ datasources: { db: { url } } });
  await db.$executeRawUnsafe(
    `TRUNCATE "AuditLog","StockMovement","Payment","SaleLine","Sale","PurchaseLine","Purchase","ProductionBatch","ProductMaterial","Party","Item","User" RESTART IDENTITY CASCADE`,
  );
  await db.user.create({ data: { name: ADMIN.name, email: ADMIN.email, role: "ADMIN", passwordHash: await bcrypt.hash(ADMIN.password, 10) } });
  await db.$disconnect();
}
