'use client';

import { useMemo, useState } from 'react';

const SIZE_PROFILES = {
  auto: { label: 'Otomatis', width: 0.14 },
  besar: { label: 'Besar', width: 0.20 },
  sedang: { label: 'Sedang', width: 0.13 },
  kecil: { label: 'Kecil', width: 0.085 },
  sangatKecil: { label: 'Sangat kecil', width: 0.055 },
};

const AUTO_SIZE = {
  'kertas dos': 'besar',
  'bundel': 'besar',
  'map': 'sedang',
  'buku folio': 'sedang',
  'amplop': 'sedang',
  'isi staples sedang': 'kecil',
  'isi staples kecil': 'sangatKecil',
  'solasi bening': 'kecil',
  'lakban': 'kecil',
  'lem fox': 'kecil',
};

const DEFAULT_ITEMS = [
  ['Kertas Dos', 'besar'], ['Map', 'sedang'], ['Isi Staples Sedang', 'kecil'], ['Buku Folio', 'sedang'],
  ['Isi Staples Kecil', 'sangatKecil'], ['Amplop', 'sedang'], ['Solasi Bening', 'kecil'], ['Lakban', 'kecil'],
  ['Lem Fox', 'kecil'], ['Bundel', 'besar']
].map(([name, size]) => ({ name, qty: 1, size, position: 'otomatis', scale: 100, file: null, fileName: '' }));

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const match = parts[0].match(/data:(.*?);/);
  if (!match) throw new Error('Format gambar tidak valid.');
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gagal membaca salah satu gambar.'));
    image.src = src;
  });
}

function removeWhiteBackground(source) {
  const maxSize = 1200;
  const factor = Math.min(1, maxSize / Math.max(source.naturalWidth, source.naturalHeight));
  const width = Math.max(1, Math.round(source.naturalWidth * factor));
  const height = Math.max(1, Math.round(source.naturalHeight * factor));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const visited = new Uint8Array(width * height);
  const stack = [];

  const isWhite = (p) => pixels[p] > 222 && pixels[p + 1] > 222 && pixels[p + 2] > 222 && pixels[p + 3] > 5;
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i] || !isWhite(i * 4)) return;
    visited[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < width; x += 1) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y += 1) { push(0, y); push(width - 1, y); }

  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = Math.floor(i / width);
    pixels[i * 4 + 3] = 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);

  const data = pixels;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas;
  const pad = Math.max(2, Math.round(Math.min(width, height) * 0.008));
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
  const cropped = document.createElement('canvas');
  cropped.width = maxX - minX + 1;
  cropped.height = maxY - minY + 1;
  cropped.getContext('2d').drawImage(canvas, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped;
}

function autoSizeFor(name) {
  return AUTO_SIZE[String(name || '').trim().toLowerCase()] || 'sedang';
}

function zoneFromPosition(position, globalPosition) {
  const value = `${position || ''} ${globalPosition || ''}`.toLowerCase();
  if (value.includes('kiri')) return 'left';
  if (value.includes('kanan')) return 'right';
  if (value.includes('belakang')) return 'back';
  if (value.includes('depan')) return 'front';
  if (value.includes('tengah')) return 'center';
  return 'center';
}

function drawGpsOverlay(ctx, width, height, values) {
  if (!values.enabled) return;
  const boxWidth = Math.min(width * 0.78, 930);
  const boxHeight = Math.min(165, Math.max(128, height * 0.18));
  const x = (width - boxWidth) / 2;
  const y = height - boxHeight - 18;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.fillStyle = '#19d34a';
  ctx.font = `bold ${Math.max(17, boxHeight * 0.15)}px Arial`;
  ctx.fillText('Check In', x + 20, y + 31);
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.max(13, boxHeight * 0.12)}px Arial`;
  ctx.fillText(values.location, x + 20, y + 59);
  ctx.font = `${Math.max(11, boxHeight * 0.095)}px Arial`;
  ctx.fillText(values.address, x + 20, y + 82);
  ctx.fillText(`Lat ${values.lat}°  Long ${values.lng}°`, x + 20, y + 105);
  ctx.fillText(`${values.date} ${values.time}  GMT +08:00`, x + 20, y + 128);
  ctx.restore();
}

function drawProduct(ctx, object, x, baselineY, targetWidth, angle, depth) {
  const ratio = object.height / object.width;
  const targetHeight = targetWidth * ratio;
  const topY = baselineY - targetHeight;
  ctx.save();
  ctx.translate(x, baselineY - targetHeight * 0.5);
  ctx.rotate(angle);
  ctx.shadowColor = 'rgba(0,0,0,0.34)';
  ctx.shadowBlur = Math.max(5, targetWidth * 0.025);
  ctx.shadowOffsetX = targetWidth * 0.012;
  ctx.shadowOffsetY = Math.max(4, targetHeight * 0.025);
  ctx.globalAlpha = 0.99;
  ctx.drawImage(object, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();
  return topY;
}

function drawRealisticComposite(background, products, globalPosition, gpsValues) {
  const canvas = document.createElement('canvas');
  canvas.width = background.naturalWidth;
  canvas.height = background.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(background, 0, 0);

  const W = canvas.width;
  const H = canvas.height;
  const zones = {
    left: { x: W * 0.25, y: H * 0.70, spread: W * 0.29 },
    center: { x: W * 0.50, y: H * 0.69, spread: W * 0.34 },
    right: { x: W * 0.75, y: H * 0.70, spread: W * 0.29 },
    back: { x: W * 0.50, y: H * 0.55, spread: W * 0.72 },
    front: { x: W * 0.50, y: H * 0.77, spread: W * 0.70 },
  };

  const expanded = [];
  products.forEach(({ item, image }) => {
    const object = removeWhiteBackground(image);
    const count = Math.min(100, Math.max(1, Number(item.qty) || 1));
    const sizeKey = item.size === 'auto' ? autoSizeFor(item.name) : (item.size || autoSizeFor(item.name));
    for (let copy = 0; copy < count; copy += 1) expanded.push({ item, object, copy, sizeKey });
  });

  expanded.sort((a, b) => {
    const za = zoneFromPosition(a.item.position, globalPosition);
    const zb = zoneFromPosition(b.item.position, globalPosition);
    const order = { back: 0, left: 1, center: 1, right: 1, front: 2 };
    return order[za] - order[zb];
  });

  const counters = {};
  expanded.forEach(({ item, object, copy, sizeKey }) => {
    const zoneName = zoneFromPosition(item.position, globalPosition);
    const zone = zones[zoneName];
    const profile = SIZE_PROFILES[sizeKey] || SIZE_PROFILES.sedang;
    const key = `${item.name}-${zoneName}`;
    const n = counters[key] || 0;
    counters[key] = n + 1;

    const cols = Math.min(6, Math.max(1, Math.ceil(Math.sqrt(Math.max(1, Number(item.qty) || 1) * 1.35))));
    const row = Math.floor(n / cols);
    const col = n % cols;
    const totalCols = Math.min(cols, Math.max(1, Number(item.qty) || 1));
    const colOffset = col - (totalCols - 1) / 2;
    const rowDepth = zoneName === 'back' ? 0.86 : zoneName === 'front' ? 1.08 : 1.0;
    const depthScale = Math.max(0.72, Math.min(1.14, 0.88 + row * 0.025)) * rowDepth;
    const userScale = Math.max(0.55, Math.min(1.75, (Number(item.scale) || 100) / 100));

    const quantityTighten = (Number(item.qty) || 1) > 8 ? 0.86 : (Number(item.qty) || 1) > 20 ? 0.78 : 1;
    const targetWidth = Math.max(34, W * profile.width * userScale * depthScale * quantityTighten);
    const spacing = Math.max(targetWidth * 0.76, zone.spread / (totalCols + 0.65));
    const x = zone.x + colOffset * spacing + Math.sin((n + 1) * 1.71) * targetWidth * 0.045;
    const baseline = zone.y + row * targetWidth * 0.52 + Math.cos((n + 1) * 1.19) * targetWidth * 0.025;
    const angle = (((n * 17) % 9) - 4) * Math.PI / 180;
    drawProduct(ctx, object, x, baseline, targetWidth, angle, row);
  });

  drawGpsOverlay(ctx, W, H, gpsValues);
  return canvas;
}

export default function Home() {
  const [background, setBackground] = useState(null);
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [position, setPosition] = useState('disusun natural di atas meja');
  const [mode, setMode] = useState('composite');
  const [gps, setGps] = useState(true);
  const [date, setDate] = useState('14/09/2026');
  const [time, setTime] = useState('09:00 AM');
  const [location, setLocation] = useState('Kecamatan Poli-polia, Sulawesi Tenggara, Indonesia');
  const [address, setAddress] = useState('SMP Negeri 1 Poli-Polia, Kabupaten Kolaka Timur, Sulawesi Tenggara, Indonesia');
  const [lat, setLat] = useState('-4.19740');
  const [lng, setLng] = useState('121.908204');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const unitCount = useMemo(() => items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0), [items]);

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item;
      if (key === 'qty') return { ...item, qty: Math.min(100, Math.max(1, Number(value) || 1)) };
      if (key === 'scale') return { ...item, scale: Math.min(175, Math.max(55, Number(value) || 100)) };
      return { ...item, [key]: value };
    }));
  };

  const handleProductFile = async (index, file) => {
    if (!file) return;
    const data = await readFile(file);
    setItems((current) => current.map((item, i) => i === index ? { ...item, file: data, fileName: file.name } : item));
  };

  const generate = async () => {
    setError(''); setResult(null);
    if (mode === 'composite' && !background) return setError('Upload foto latar terlebih dahulu untuk mode Compositing.');
    const gpsValues = { enabled: gps, date, time, location, address, lat, lng };
    setLoading(true);
    try {
      if (mode === 'composite') {
        const selected = items.filter((item) => item.file);
        if (!selected.length) return setError('Upload minimal satu foto ATK asli.');
        const backgroundImage = await loadImage(background);
        const products = await Promise.all(selected.map(async (item) => ({ item, image: await loadImage(item.file) })));
        const canvas = drawRealisticComposite(backgroundImage, products, position, gpsValues);
        const output = await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('Gagal membuat PNG.')), 'image/png'));
        setResult(output); return;
      }

      const form = new FormData();
      if (background) form.append('background', dataUrlToBlob(background), 'background.jpg');
      form.append('position', position);
      form.append('items', JSON.stringify(items.map(({ name, qty, size, position, scale, fileName }) => ({ name, qty, size, position, scale, fileName }))));
      items.forEach((item, index) => { if (item.file) form.append(`atk_${index}`, dataUrlToBlob(item.file), item.fileName || `atk-${index}.png`); });

      const response = await fetch('/api/generate', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Gagal membuat gambar dengan Imagen 3.');
      if (payload.image) {
        setResult(`data:image/png;base64,${payload.image}`);
      } else {
        throw new Error('Tidak menerima hasil gambar dari Imagen 3 API.');
      }
    } catch (err) {
      setError(err?.message || 'Terjadi kesalahan saat membuat gambar.');
    } finally { setLoading(false); }
  };

  const download = () => {
    if (!result) return;
    const link = document.createElement('a'); link.href = result; link.download = 'hasil-generator-atk-v5-imagen3.png'; link.click();
  };

  return (
    <main className="wrap">
      <header className="head">
        <div><h1>Generator Foto ATK (Google Imagen 3 API)</h1><p>SMP Negeri 1 Poli-Polia · V5 · skala nyata • jumlah presisi • terintegrasi Google Imagen 3</p></div>
        <span className="pill">{unitCount} unit</span>
      </header>

      <div className="grid">
        <section className="panel">
          <div className="section">
            <h2>1. Foto Latar</h2>
            <label className="upload">{background ? 'Ganti foto latar' : 'Upload foto latar'}<input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setBackground(await readFile(file)); }} /></label>
            {background && <img className="thumb bgthumb" src={background} alt="Foto latar" />}
          </div>

          <div className="section">
            <h2>2. Foto ATK Asli</h2>
            <p className="help"><b>Penting:</b> V5 otomatis memangkas ruang putih foto produk sebelum menentukan ukuran. Pada mode AI Imagen 3, deskripsi inventaris dikirimkan ke model gambar AI Google.</p>
            {items.map((item, index) => (
              <div className="item" key={index}>
                <div className="itemtop"><b>ATK {index + 1}</b>{items.length > 1 && <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>Hapus</button>}</div>
                <div className="row"><input value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} placeholder="Nama ATK" /><input type="number" min="1" max="100" value={item.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} aria-label={`Jumlah ${item.name}`} /></div>
                <div className="row three"><select value={item.size} onChange={(e) => updateItem(index, 'size', e.target.value)} aria-label={`Ukuran ${item.name}`}>{Object.entries(SIZE_PROFILES).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}</select><select value={item.position} onChange={(e) => updateItem(index, 'position', e.target.value)} aria-label={`Posisi ${item.name}`}><option value="otomatis">Posisi otomatis</option><option value="kiri">Kiri</option><option value="tengah">Tengah</option><option value="kanan">Kanan</option><option value="belakang">Belakang</option><option value="depan">Depan</option></select></div>
                <label className="scaleLabel">Skala manual: <b>{item.scale}%</b><input className="range" type="range" min="55" max="175" value={item.scale} onChange={(e) => updateItem(index, 'scale', e.target.value)} /></label>
                <label className="smallupload">{item.file ? 'Ganti foto ATK' : 'Upload foto ATK'}<input type="file" accept="image/*" onChange={(e) => handleProductFile(index, e.target.files?.[0])} /></label>
                {item.file && <img className="thumb" src={item.file} alt={item.name || 'ATK'} />}
              </div>
            ))}
            <button type="button" className="add" onClick={() => setItems((current) => [...current, { name: '', qty: 1, size: 'sedang', position: 'otomatis', scale: 100, file: null, fileName: '' }])}>+ Tambah ATK</button>
          </div>

          <div className="section">
            <h2>3. Posisi Umum</h2>
            <textarea value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Contoh: barang disusun natural di atas meja; barang besar di belakang dan barang kecil di depan." />
            <div className="chips">{['kiri meja', 'tengah meja', 'kanan meja', 'belakang meja', 'depan meja'].map((value) => <button type="button" key={value} onClick={() => setPosition((current) => current ? `${current}; ${value}` : value)}>{value}</button>)}</div>
          </div>

          <div className="section">
            <h2>4. Metode</h2>
            <div className="modes"><button type="button" className={mode === 'composite' ? 'active' : ''} onClick={() => setMode('composite')}>Dokumentasi Presisi ⭐</button><button type="button" className={mode === 'ai' ? 'active' : ''} onClick={() => setMode('ai')}>AI Fotorealistik (Imagen 3)</button></div>
            <p className="help">Gunakan <b>Dokumentasi Presisi</b> untuk menggabungkan foto asli secara deterministik. <b>AI Imagen 3</b> menghasilkan gambar visual berbasis prompt AI Google.</p>
          </div>

          <div className="section">
            <h2>5. GPS / Timestamp</h2>
            <label className="check"><input type="checkbox" checked={gps} onChange={(e) => setGps(e.target.checked)} /> Tampilkan overlay GPS</label>
            <div className="row"><input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Tanggal" /><input value={time} onChange={(e) => setTime(e.target.value)} placeholder="Waktu" /></div>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lokasi" /><textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat" /><div className="row"><input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" /><input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" /></div>
          </div>

          <div className="section"><button type="button" className="generate" disabled={loading} onClick={generate}>{loading ? 'MEMPROSES...' : 'GENERATE GAMBAR V5'}</button>{result && <button type="button" className="download" onClick={download}>Simpan PNG</button>}{error && <div className="error">{error}</div>}</div>
        </section>

        <section className="preview"><h2>Preview Hasil</h2>{result ? <img className="result" src={result} alt="Hasil generator ATK" /> : background ? <img className="result" src={background} alt="Preview foto latar" /> : <div className="empty">Upload foto latar untuk melihat preview.</div>}<div className="status"><b>V5 Imagen 3:</b> Menggunakan endpoint resmi Google AI Studio (`imagen-3.0-generate-002:generateImages`) untuk menghasilkan gambar AI fotorealistik secara langsung.</div></section>
      </div>
    </main>
  );
}
