# Generator Foto ATK V5 — SMP Negeri 1 Poli-Polia (Imagen 3 API - Fixed Safe JSON)

Memperbaiki error `Unexpected end of JSON input` dengan validasi aman (safe JSON parsing) pada Client & Server Route.

## Penyebab Error `Unexpected end of JSON input`:
1. **Ukuran File Terlalu Besar (> 4.5 MB)**: Vercel membatasi upload Serverless Function maks. 4.5MB. Jika melebihi batas, Vercel mengembalikan halaman error HTML / kosong sehingga `response.json()` gagal.
2. **Timeout Vercel / API**: Respon dari API kosong atau terputus sebelum JSON selesai dikirim.

## Cara Deploy ke Vercel:
1. Hubungkan repositori ke Vercel.
2. Tambahkan Environment Variable: `GEMINI_API_KEY`.
3. Deploy!
