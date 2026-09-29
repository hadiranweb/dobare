import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "dobare_admin";
const secret = () => process.env.ADMIN_PASSWORD;

export function adminConfigured() { return Boolean(secret()); }
export function verifyPassword(password: string) {
  const expected = secret();
  if (!expected) return false;
  const a = createHmac("sha256", "dobare-password").update(password).digest();
  const b = createHmac("sha256", "dobare-password").update(expected).digest();
  return timingSafeEqual(a, b);
}
export function makeAdminCookie() {
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const signature = createHmac("sha256", secret()!).update(String(expiry)).digest("hex");
  return `${cookieName}=${expiry}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export function isAdmin(request: Request) {
  const password = secret();
  if (!password) return false;
  const value = request.headers.get("cookie")?.split("; ").find(c => c.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!value) return false;
  const [expiry, signature] = value.split(".");
  if (!expiry || !signature || Number(expiry) < Date.now() || !/^\d+$/.test(expiry) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", password).update(expiry).digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
