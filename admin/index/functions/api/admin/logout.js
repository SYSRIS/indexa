import { json, cookieValue, sha256, clearCookie } from "../../_lib.js";
export async function onRequestPost({ request, env }) {
  const token = cookieValue(request, "dk_session");
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
}
