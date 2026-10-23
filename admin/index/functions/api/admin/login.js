import { json, parseJson, randomToken, sha256, adminCookie } from "../../_lib.js";

async function verifyPassword(password, stored) {
  // Stored format: pbkdf2$iterations$saltHex$hashHex
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;
  const fromHex = (s) => new Uint8Array((s.match(/.{1,2}/g) || []).map(x => parseInt(x, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromHex(parts[2]), iterations, hash: "SHA-256" }, key, 256);
  const actual = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
  return actual === parts[3];
}
export async function onRequestPost({ request, env }) {
  try {
    const body = await parseJson(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password || username.length > 100 || password.length > 200) return json({ error: "Username/password wajib diisi." }, 400);
    if (username !== env.ADMIN_USERNAME || !(await verifyPassword(password, env.ADMIN_PASSWORD_HASH))) {
      // Small delay helps discourage rapid guessing; add Cloudflare rate limiting/WAF for production.
      await new Promise(resolve => setTimeout(resolve, 350));
      return json({ error: "Login tidak valid." }, 401);
    }
    let admin = await env.DB.prepare("SELECT id, username FROM admins WHERE username=?").bind(username).first();
    if (!admin) {
      const result = await env.DB.prepare("INSERT INTO admins(username,password_hash) VALUES(?,?)").bind(username, env.ADMIN_PASSWORD_HASH).run();
      admin = { id: result.meta.last_row_id, username };
    }
    const token = randomToken();
    const tokenHash = await sha256(token);
    const expires = Math.floor(Date.now() / 1000) + 43200;
    await env.DB.prepare("INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES(?,?,?)").bind(tokenHash, admin.id, expires).run();
    return json({ ok: true, username }, 200, { "Set-Cookie": adminCookie(token) });
  } catch (e) {
    return json({ error: "Permintaan login gagal." }, 400);
  }
}
