import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const adminRoot = path.resolve(__dirname, "../src/app/api/admin");

const intentionallyPublic = new Map<string, string>([
  ["unlock/route.ts", "Password gate that creates the admin session"],
  ["session/route.ts", "Reports only whether the admin cookie is valid"],
  ["lock/route.ts", "Clears the admin cookie and does not read or mutate league data"],
]);

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name === "route.ts") files.push(full);
  }
  return files;
}

describe("admin route authorization", () => {
  it("requires an admin session on every handler except the password gate", () => {
    const missing: string[] = [];
    const files = walk(adminRoot);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const rel = path.relative(adminRoot, file).split(path.sep).join("/");
      const source = fs.readFileSync(file, "utf8");
      const handlers = source.split(/export async function /).slice(1);
      expect(handlers.length, rel).toBeGreaterThan(0);

      if (intentionallyPublic.has(rel)) {
        expect(source, rel).not.toMatch(/deleteMany|updateMany/);
        continue;
      }

      handlers.forEach((handler, index) => {
        const name = handler.split("(")[0]?.trim() || `handler-${index}`;
        if (!/requireAdmin\s*\(|isAdminUnlocked\s*\(/.test(handler)) {
          missing.push(`${rel} ${name}`);
        }
      });
    }

    expect(missing).toEqual([]);
  });

  it("keeps test reset behind the admin session and the production switch", () => {
    const source = fs.readFileSync(path.join(adminRoot, "reset-test/route.ts"), "utf8");
    const handler = source.split("export async function POST")[1] ?? "";
    const enabledAt = handler.indexOf("isTestDataResetEnabled");
    const adminAt = handler.indexOf("isAdminUnlocked");
    const deleteAt = handler.indexOf("deleteMany");
    expect(enabledAt).toBeGreaterThan(-1);
    expect(adminAt).toBeGreaterThan(enabledAt);
    expect(deleteAt).toBeGreaterThan(adminAt);
    const guard = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/reset-guard.ts"),
      "utf8"
    );
    expect(guard).toContain("ALLOW_TEST_DATA_RESET");
    expect(guard).toContain('env.NODE_ENV !== "production"');
  });
});
