# Generator Foto ATK V5 — SMP Negeri 1 Poli-Polia (Imagen 3 API Edition)

Proyek ini telah diperbarui untuk menggunakan **Google Imagen 3 API** (`imagen-3.0-generate-002`) untuk generasi gambar AI fotorealistik secara langsung di Vercel.

## Fitur & Metode
1. **Dokumentasi Presisi ⭐ (Client-side Canvas)**
   - Tanpa API Key.
   - Menggabungkan foto latar asli & foto ATK asli secara langsung.
   - Skala relatif presisi & overlay GPS/Timestamp.

2. **AI Fotorealistik (Google Imagen 3 API)**
   - Menggunakan endpoint `imagen-3.0-generate-002:predict`.
   - Mengolah deskripsi barang inventaris ATK dan menampilkannya sebagai foto dokumentasi stok.

## Cara Deploy ke Vercel
1. Upload folder proyek ini ke repositori GitHub kamu.
2. Hubungkan ke **Vercel Dashboard** -> *Import Project*.
3. Pada **Settings > Environment Variables**, tambahkan:
   - `GEMINI_API_KEY`: Kunci API Google AI Studio milikmu.
   - `IMAGEN_MODEL`: `imagen-3.0-generate-002` (opsional).
4. Deploy!
