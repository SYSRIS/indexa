import { json } from "../../_lib.js";
export async function onRequestGet({ params, env }) {
  const key = String(params.key || "");
  if (!key.startsWith("menu/") || key.includes("..")) return new Response("Not found", { status: 404 });
  const obj = await env.MENU_IMAGES.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=86400");
  headers.set("x-content-type-options", "nosniff");
  return new Response(obj.body, { headers });
}
