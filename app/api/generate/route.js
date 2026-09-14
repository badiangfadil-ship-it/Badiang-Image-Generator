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
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateImages?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: promptText,
        number_of_images: 1,
        output_mime_type: 'image/png',
        aspect_ratio: '16:9',
      }),
    });

    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('Non-JSON response from Google API:', rawText);
      return Response.json(
        { error: `Google API mengembalikan respon non-JSON (${res.status}): ${rawText.substring(0, 150)}` },
        { status: 502 }
      );
    }

    if (!res.ok) {
      console.error('Imagen API Error:', data);
      return Response.json(
        { error: data?.error?.message || `Gagal memanggil Imagen 3 API (${res.status})` },
        { status: res.status }
      );
    }

    const base64Image =
      data?.generatedImages?.[0]?.image?.imageBytes ||
      data?.generatedImages?.[0]?.image?.bytesBase64Encoded ||
      data?.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Image) {
      return Response.json({ error: 'Imagen 3 API tidak mengembalikan data gambar.' }, { status: 400 });
    }

    return Response.json({ image: base64Image });
  } catch (error) {
    console.error('Route handler error:', error);
    return Response.json(
      { error: error?.message || 'Terjadi kesalahan saat membuat gambar dengan Imagen 3 API.' },
      { status: 500 }
    );
  }
}
