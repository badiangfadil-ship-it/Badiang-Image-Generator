export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request) {
  try {
    const form = await request.formData();
    const position = String(form.get('position') || 'disusun natural di atas meja');
    const items = JSON.parse(String(form.get('items') || '[]'));

    const inventory = items
      .filter((x) => Number(x.qty) > 0)
      .map((x) => `${x.name || 'ATK'}: ${x.qty} unit`)
      .join(', ');

    // Google AI Studio API Key tidak mendukung Image Generation via REST tanpa Vertex AI.
    // Memberikan respon ramah agar pengguna berpindah ke mode Dokumentasi Presisi.
    return Response.json(
      {
        error: `Fitur AI Image Generation memerlukan integrasi Google Cloud Vertex AI. Silakan ganti metode ke "Dokumentasi Presisi ⭐" di bagian panel kiri untuk membuat dokumentasi foto inventaris (${inventory}) secara gratis dan instan langsung di browser.`
      },
      { status: 400 }
    );
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Terjadi kesalahan pada server backend.' },
      { status: 500 }
    );
  }
}
