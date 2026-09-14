import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'OPENAI_API_KEY belum dipasang di Vercel.' },
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
    let response;

    // Coba dall-e-3, jika akun Tier 0 otomatis fallback ke dall-e-2
    try {
      response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
      });
    } catch (err) {
      if (err?.status === 400 || err?.message?.includes('does not exist')) {
        response = await openai.images.generate({
          model: 'dall-e-2',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
        });
      } else {
        throw err;
      }
    }

    const imageUrl = response.data[0].url;

    // Unduh gambar dari URL OpenAI lalu konversi ke Base64
    const imgRes = await fetch(imageUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    return Response.json({ image: base64Image });
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Gagal membuat gambar AI dengan OpenAI.' },
      { status: 500 }
    );
  }
}
