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

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
    });

    const imageUrl = response.data[0].url;
    const imgRes = await fetch(imageUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    return Response.json({ image: base64Image });
  } catch (error) {
    if (error?.status === 400 && error?.message?.includes('does not exist')) {
      return Response.json(
        { error: 'Akun OpenAI belum memiliki saldo kredit aktif (minimal $5 prepaid). Silakan isi saldo di OpenAI Billing atau ganti ke mode "Dokumentasi Presisi ⭐".' },
        { status: 400 }
      );
    }
    return Response.json(
      { error: error?.message || 'Gagal membuat gambar dengan OpenAI.' },
      { status: 500 }
    );
  }
}
