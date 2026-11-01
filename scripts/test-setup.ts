// Creates the tables in the TEST database (reads .env.test).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const line = readFileSync(".env.test", "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL"));
if (!line) throw new Error("Put DATABASE_URL in .env.test");
const url = line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
const env = { ...process.env, DATABASE_URL: url };
execSync("npx prisma db push --skip-generate", { stdio: "inherit", env });
execSync("npx prisma db execute --file prisma/checks.sql --schema prisma/schema.prisma", { stdio: "inherit", env });
