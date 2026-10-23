import { json, requireAdmin } from "../../_lib.js";
export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  return admin ? json({ authenticated: true, username: admin.username }) : json({ authenticated: false }, 401);
}
