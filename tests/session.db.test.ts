// One login per account: a newer login signs the older device out. Needs the TEST database.
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// Stands in for the browser's cookie. Each test swaps it to act as a different device.
const device = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () => (device.token ? { value: device.token } : undefined),
    set: (_name: string, value: string) => { device.token = value; },
    delete: () => { device.token = undefined; },
  }),
}));

import { db } from "../src/server/db";
import { getUser, startSession } from "../src/server/auth";

let user: { id: string; role: string };
const login = async () => { device.token = undefined; await startSession(user); return device.token; };

beforeAll(async () => {
  if (!/test/i.test(process.env.DATABASE_URL ?? "")) throw new Error("Refusing to run: DATABASE_URL must be a TEST database (name contains 'test').");
  user = await db.user.create({ data: { name: "One Login", email: `one-login-${Date.now()}@t.local`, passwordHash: "x", role: "ADMIN" } });
});
afterAll(async () => {
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
});

describe("single login per account", () => {
  it("keeps the latest device signed in and signs the older one out", async () => {
    const first = await login();
    expect((await getUser())?.id).toBe(user.id);

    const second = await login();
    expect((await getUser())?.id).toBe(user.id);

    device.token = first;
    expect(await getUser()).toBeNull();

    device.token = second;
    expect((await getUser())?.id).toBe(user.id);
  });
});
