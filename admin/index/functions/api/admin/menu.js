import { json, requireAdmin, parseJson, safeText } from "../../_lib.js";
export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  const { results } = await env.DB.prepare("SELECT * FROM menu_items ORDER BY id DESC").all();
  return json({ items: results });
}
export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  try {
    const b = await parseJson(request);
    const name = safeText(b.name, 120), description = safeText(b.description, 1000), category = safeText(b.category || "Makanan", 60);
    const price = Number(b.price), stock = Number(b.stock);
    if (!name || !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0) return json({ error: "Nama, harga, atau stok tidak valid." }, 400);
    await env.DB.prepare("INSERT INTO menu_items(name,description,category,price,stock,image_key,is_available) VALUES(?,?,?,?,?,?,?)")
      .bind(name, description, category, price, stock, b.image_key ? safeText(b.image_key, 200) : null, b.is_available === false ? 0 : 1).run();
    return json({ ok: true }, 201);
  } catch { return json({ error: "Gagal menyimpan menu." }, 400); }
}
export async function onRequestPut({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  try {
    const b = await parseJson(request), id = Number(b.id);
    const name = safeText(b.name, 120), description = safeText(b.description, 1000), category = safeText(b.category || "Makanan", 60);
    const price = Number(b.price), stock = Number(b.stock);
    if (!Number.isInteger(id) || id < 1 || !name || !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0) return json({ error: "Data menu tidak valid." }, 400);
    await env.DB.prepare("UPDATE menu_items SET name=?,description=?,category=?,price=?,stock=?,image_key=?,is_available=?,updated_at=datetime('now') WHERE id=?")
      .bind(name, description, category, price, stock, b.image_key ? safeText(b.image_key, 200) : null, b.is_available === false ? 0 : 1, id).run();
    return json({ ok: true });
  } catch { return json({ error: "Gagal memperbarui menu." }, 400); }
}
export async function onRequestDelete({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  try {
    const b = await parseJson(request), id = Number(b.id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "ID tidak valid." }, 400);
    const item = await env.DB.prepare("SELECT image_key FROM menu_items WHERE id=?").bind(id).first();
    await env.DB.prepare("DELETE FROM menu_items WHERE id=?").bind(id).run();
    if (item?.image_key) await env.MENU_IMAGES.delete(item.image_key).catch(() => {});
    return json({ ok: true });
  } catch { return json({ error: "Gagal menghapus menu." }, 400); }
}
