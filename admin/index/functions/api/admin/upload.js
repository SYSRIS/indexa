import { json, requireAdmin, safeText } from "../../_lib.js";
export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  try {
    const form = await request.formData(), file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return json({ error: "File gambar wajib dipilih." }, 400);
    if (file.size > 4 * 1024 * 1024) return json({ error: "Ukuran maksimal 4 MB." }, 400);
    const allowed = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    if (!allowed[file.type]) return json({ error: "Format harus JPG, PNG, atau WebP." }, 400);
    const key = `menu/${crypto.randomUUID()}.${allowed[file.type]}`;
    await env.MENU_IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
    return json({ ok: true, image_key: key });
  } catch { return json({ error: "Upload gagal. Periksa binding R2." }, 400); }
}
