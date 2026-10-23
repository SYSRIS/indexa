import { json, requireAdmin } from "../../_lib.js";
export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  const [menu, orders, revenue, pending] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS total FROM menu_items").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM orders").first(),
    env.DB.prepare("SELECT COALESCE(SUM(subtotal),0) AS total FROM orders WHERE payment_status='Lunas'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM orders WHERE order_status NOT IN ('Selesai','Dibatalkan')").first()
  ]);
  return json({ menu: menu.total, orders: orders.total, revenue: revenue.total, pending: pending.total });
}
