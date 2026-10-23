const enc = new TextEncoder();

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders }
  });
}
export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export function randomToken(bytes = 32) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return [...arr].map(b => b.toString(16).padStart(2, "0")).join("");
}
export function cookieValue(request, name) {
  const header = request.headers.get("Cookie") || "";
  const found = header.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}
export async function requireAdmin(request, env) {
  const token = cookieValue(request, "dk_session");
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT admins.id, admins.username FROM sessions JOIN admins ON admins.id=sessions.admin_id WHERE sessions.token_hash=? AND sessions.expires_at>?"
  ).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  return row || null;
}
export function adminCookie(token, maxAge = 60 * 60 * 12) {
  return `dk_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}
export function clearCookie() {
  return "dk_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}
export async function parseJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new Error("Content-Type harus application/json");
  return await request.json();
}
export function safeText(v, max = 500) {
  return String(v ?? "").trim().slice(0, max);
}
