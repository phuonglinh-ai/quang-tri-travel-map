// Tải glyph PBF (Noto Sans, giấy phép SIL OFL) cho nhãn chữ trên bản đồ và lưu trữ tại chỗ trong
// public/fonts, để trang web không phụ thuộc máy chủ font bên thứ ba khi chạy.
// Chỉ lấy các dải Unicode cần cho tiếng Việt.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, USER_AGENT } from './lib.mjs';

const BASE = 'https://protomaps.github.io/basemaps-assets/fonts';
const FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
const RANGES = [
  '0-255', // Latin cơ bản
  '256-511', // Latin mở rộng A/B: Ă ă Đ đ Ơ ơ Ư ư
  '768-1023', // dấu kết hợp
  '7680-7935', // Latin mở rộng bổ sung: ạ ả ấ … ỹ
  '8192-8447', // dấu câu: – — “ ” …
];

for (const font of FONTS) {
  const dir = path.join(ROOT, 'public', 'fonts', font);
  fs.mkdirSync(dir, { recursive: true });
  for (const r of RANGES) {
    const out = path.join(dir, `${r}.pbf`);
    if (fs.existsSync(out)) continue;
    const res = await fetch(`${BASE}/${encodeURIComponent(font)}/${r}.pbf`, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`${font} ${r}: HTTP ${res.status}`);
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  }
  console.log(`✓ Glyph: ${font}`);
}

// Giấy phép OFL phải đi kèm khi phân phối lại font.
const ofl = path.join(ROOT, 'public', 'fonts', 'OFL.txt');
if (!fs.existsSync(ofl)) {
  const res = await fetch('https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt', { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`OFL.txt: HTTP ${res.status}`);
  fs.writeFileSync(ofl, await res.text());
}
