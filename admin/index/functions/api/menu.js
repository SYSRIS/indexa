import { json } from "../_lib.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id,name,description,category,price,stock,image_key FROM menu_items WHERE is_available=1 ORDER BY category,name"
  ).all();
  return json({ items: results });
}
