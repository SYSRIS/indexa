import { json, requireAdmin, parseJson, safeText } from "../../_lib.js";
const STATUSES = ["Pesanan Baru","Diproses","Siap Diambil","Dalam Pengantaran","Selesai","Dibatalkan"];
const PAYMENTS = ["Menunggu Pembayaran","Lunas","Gagal","Dikembalikan"];
export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 500").all();
  return json({ orders: results });
}
export async function onRequestPatch({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  try {
    const b = await parseJson(request), id = Number(b.id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "ID tidak valid." }, 400);
    const current = await env.DB.prepare("SELECT id FROM orders WHERE id=?").bind(id).first();
    if (!current) return json({ error: "Pesanan tidak ditemukan." }, 404);
    if (b.order_status && !STATUSES.includes(b.order_status)) return json({ error: "Status pesanan tidak valid." }, 400);
    if (b.payment_status && !PAYMENTS.includes(b.payment_status)) return json({ error: "Status pembayaran tidak valid." }, 400);
    if (b.order_status && b.payment_status) {
      await env.DB.prepare("UPDATE orders SET order_status=?,payment_status=?,updated_at=datetime('now') WHERE id=?").bind(b.order_status,b.payment_status,id).run();
    } else if (b.order_status) {
      await env.DB.prepare("UPDATE orders SET order_status=?,updated_at=datetime('now') WHERE id=?").bind(b.order_status,id).run();
    } else if (b.payment_status) {
      await env.DB.prepare("UPDATE orders SET payment_status=?,updated_at=datetime('now') WHERE id=?").bind(b.payment_status,id).run();
    } else return json({ error: "Tidak ada perubahan." }, 400);
    return json({ ok: true });
  } catch { return json({ error: "Gagal memperbarui pesanan." }, 400); }
}
