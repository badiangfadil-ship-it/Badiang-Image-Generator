import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'OPENAI_API_KEY belum dipasang di Vercel. Gunakan mode Dokumentasi Presisi.' },
        { status: 500 }
      );
    }

    const form = await request.formData();
    const position = String(form.get('position') || 'disusun natural di atas meja');
    const items = JSON.parse(String(form.get('items') || '[]'));

    const inventory = items
      .filter((x) => Number(x.qty) > 0)
      .map((x) => `${x.name || 'ATK'}: ${x.qty} unit`)
      .join(', ');

    const prompt = `A realistic photo of school stationery inventory on a desk at SMP Negeri 1 Poli-Polia. Items: ${inventory}. Placement note: ${position}. Professional realistic documentation photo.`;

    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    });

    const base64Image = response.data[0].b64_json;
    return Response.json({ image: base64Image });
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Gagal membuat gambar AI dengan OpenAI.' },
      { status: 500 }
    );
  }
}
