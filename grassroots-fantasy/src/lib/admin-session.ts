import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "gfl-admin";
const TOKEN_EXPIRY = "7d";

function secret() {
  return new TextEncoder().encode(
    process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || "gfl-admin-fallback"
  );
}

export async function isAdminUnlocked(): Promise<boolean> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<{ role: "admin" }> {
  if (!(await isAdminUnlocked())) throw new Error("Forbidden");
  return { role: "admin" };
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export async function setAdminCookie() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAdminCookie() {
  cookies().delete(COOKIE);
}
