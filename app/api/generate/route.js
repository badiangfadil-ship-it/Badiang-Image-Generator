export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'GEMINI_API_KEY belum dipasang di Vercel. Gunakan mode Dokumentasi Presisi jika tidak memakai API.' },
        { status: 500 }
      );
    }

    const form = await request.formData();
    const position = String(form.get('position') || 'disusun natural di atas meja');
    const items = JSON.parse(String(form.get('items') || '[]'));

    const inventory = items
      .filter((x) => Number(x.qty) > 0)
      .map(
        (x) =>
          `${x.name || 'ATK'}: ${x.qty} unit, ukuran relatif ${x.size || 'otomatis'}, posisi ${x.position || 'otomatis'}`
      )
      .join('; ');

    const promptText = `A high quality realistic professional stock photo of school office stationery inventory laid out on an office desk at SMP Negeri 1 Poli-Polia. Stationery items: ${inventory}. Realistic shadows, natural desk lighting, camera perspective from above, realistic proportions. Placement note: ${position}. Photo style.`;

    const modelName = process.env.IMAGEN_MODEL || 'imagen-3.0-generate-002';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: promptText,
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/png',
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Imagen API Error:', data);
      throw new Error(data?.error?.message || `Gagal memanggil Imagen 3 API (${res.status})`);
    }

    const base64Image = data?.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Image) {
      throw new Error('Imagen 3 API tidak mengembalikan data gambar.');
    }

    return Response.json({ image: base64Image });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error?.message || 'Terjadi kesalahan saat membuat gambar dengan Imagen 3 API.' },
      { status: 500 }
    );
  }
}
