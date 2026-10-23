# Dapur Kita — Admin Panel untuk Cloudflare Pages

Panel admin restoran dengan login berbasis cookie HttpOnly, dashboard ringkasan, CRUD menu, stok, upload foto ke R2, daftar pesanan, update status pesanan/pembayaran, dan riwayat pesanan (maksimal 500 terbaru pada panel).

## Struktur
- `public/admin/` — UI panel admin.
  - `public/admin/panel.html` — versi satu file dengan CSS dan JavaScript tertanam; buka langsung untuk demo atau akses `/admin/panel.html` saat backend aktif.
- `public/menu.html` — halaman publik di `/menu.html`, mengambil menu aktif dari D1 saat di-deploy dan menampilkan contoh menu saat dibuka sebagai file lokal.
- `functions/api/menu.js` — API publik yang hanya menampilkan menu aktif.
- `functions/api/admin/` — API yang dilindungi autentikasi.
- `functions/api/images/[key].js` — menyajikan gambar dari R2.
- `schema.sql` — skema D1.
- `wrangler.toml` — binding Cloudflare.

## 1. Buat database dan bucket
1. Buat D1 database bernama `dapur-kita-db` di Cloudflare.
2. Jalankan `schema.sql` pada D1 Console, atau dari Wrangler:
   `npx wrangler d1 execute dapur-kita-db --remote --file=./schema.sql`
3. Buat R2 bucket bernama `dapur-kita-images`.
4. Isi `database_id` di `wrangler.toml` dengan ID database yang sebenarnya.
5. Deploy folder ini sebagai project Cloudflare Pages yang mendukung Pages Functions. Hubungkan binding D1 bernama `DB` dan R2 bernama `MENU_IMAGES` di Settings > Functions > Bindings. Pastikan nama binding sama persis.

## 2. Buat hash password admin
Gunakan Node.js lokal. Simpan script berikut sebagai `make-password-hash.mjs`, lalu jalankan `node make-password-hash.mjs` dan masukkan password admin. Jangan unggah script/password ke repositori.

```js
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
const rl = createInterface({ input: stdin, output: stdout });
const password = await rl.question('Password admin: ');
rl.close();
if (password.length < 14) throw new Error('Gunakan minimal 14 karakter.');
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 210000, 32, 'sha256');
console.log(`pbkdf2$210000$${salt.toString('hex')}$${hash.toString('hex')}`);
```

Di Cloudflare Pages > Settings > Variables and Secrets, tambahkan:
- `ADMIN_USERNAME`: alamat email yang dipakai sebagai ID login admin, misalnya email milik Anda. Ini tidak membuat mailbox email baru.
- `ADMIN_PASSWORD_HASH`: output hash di atas, bukan password polos.
- `SESSION_SECRET`: buat nilai acak panjang (minimal 32 karakter). Saat ini sesi memakai token acak kriptografis yang di-hash di database; secret ini disiapkan untuk pengembangan integrasi lanjutan.

Setelah environment variable dibuat, lakukan redeploy. Login admin di `/admin/`.

## 3. Deploy
Cara paling mudah:
1. Push seluruh file project ke GitHub.
2. Di Cloudflare Dashboard, Workers & Pages > Create > Pages > Connect to Git.
3. Pilih repo ini. Framework preset: None. Build command kosong; output directory `public`.
4. Tambahkan binding D1 dan R2 serta secrets seperti di atas.
5. Deploy dan bagikan link admin `https://domain-kamu/admin/` kepada admin serta link menu publik `https://domain-kamu/menu.html` kepada pelanggan.

Alternatif dengan Wrangler: `npx wrangler pages deploy public` — pastikan Pages project dan Functions ikut ter-deploy dari direktori project yang benar. Untuk deployment dari Git, folder `functions/` harus berada di root repository.

## Catatan keamanan dan batasan
- Jangan simpan password, token WhatsApp, atau kredensial di file JavaScript frontend atau GitHub.
- Aktifkan Cloudflare WAF/rate limiting untuk endpoint login dan batasi akses admin bila memungkinkan.
- Tambahkan backup D1 berkala dan uji restore sebelum produksi.
- Jangan menganggap pembayaran otomatis terverifikasi hanya karena pelanggan mengunggah bukti; cocokkan pembayaran di bank/penyedia QRIS.
- Endpoint API pesanan pelanggan belum disediakan dalam starter panel ini. Panel menampilkan pesanan yang sudah masuk ke tabel `orders`; checkout/frontend publik harus memasukkan pesanan ke tabel tersebut melalui endpoint server-side yang divalidasi.
- Upload foto menggunakan R2. File publik disajikan melalui route gambar; jangan simpan file sensitif di bucket ini.
- `SESSION_SECRET` tidak dipakai oleh versi ini; sesi menggunakan token acak 256-bit, disimpan sebagai hash, dan cookie HttpOnly/Secure/SameSite=Strict.
- Notifikasi WhatsApp belum diaktifkan dalam paket ini. Integrasikan WhatsApp Cloud API dari fungsi server-side setelah menambahkan secrets resmi Meta; jangan memanggil API WhatsApp langsung dari browser.
