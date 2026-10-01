// Chuẩn hóa số hiệu và tên đường từ OSM để ghi nhãn trên bản đồ (hàm thuần, có test riêng).
// Nguyên tắc: chỉ sửa cách viết khi chắc chắn; số hiệu không rõ loại đường thì bỏ, không đoán.

/** Thứ tự ưu tiên khi một đoạn mang nhiều số hiệu, cũng là thứ tự quyết định màu biển số. */
const NETWORK_ORDER = ['ct', 'ql', 'hcm', 'dt'];

/**
 * Chuẩn hóa một token số hiệu đã có tiền tố. Trả về { net, text } hoặc null.
 * Cao tốc giữ số 0 đứng đầu như cách viết chính thức (CT.01). "TL" (tỉnh lộ) đổi thành "ĐT" (đường tỉnh).
 */
function prefixed(token) {
  const m = /^(CT|QL|ĐT|DT|TL)\s*\.?\s*(\d+[A-Z]?)$/u.exec(token.toUpperCase());
  if (m) {
    const [, p, n] = m;
    if (p === 'CT') return { net: 'ct', text: `CT.${n}` };
    if (p === 'QL') return { net: 'ql', text: `QL.${n}` };
    return { net: 'dt', text: `ĐT.${n}` };
  }
  if (/^HCM$/i.test(token)) return { net: 'hcm', text: 'HCM' };
  return null;
}

const tokensOf = (ref) =>
  String(ref ?? '')
    .normalize('NFC')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

/** Tập số hiệu quốc lộ đã được ghi đầy đủ tiền tố ở đâu đó trong dữ liệu (dùng để xác nhận số trơn). */
export function knownNationalRefs(refs) {
  const known = new Set();
  for (const ref of refs) for (const t of tokensOf(ref)) {
    const r = prefixed(t);
    if (r?.net === 'ql') known.add(r.text);
  }
  return known;
}

/**
 * Danh sách số hiệu đã chuẩn hóa của một đoạn đường, theo thứ tự ưu tiên, không trùng.
 * - Số trơn ("15", "9E") trên đường trục (trunk) chỉ được coi là quốc lộ khi "QL.<số>" có thật trong dữ liệu.
 * - Số trơn ở cấp khác, "ĐH" (đường huyện), "ĐVB"… bị bỏ.
 * - Đoạn không có số hiệu nhưng tên đúng là "Quốc lộ <số>" (không có chữ "cũ") thì lấy số từ tên.
 */
export function normalizeRefs({ ref, name, cls }, knownQL) {
  const out = [];
  for (const t of tokensOf(ref)) {
    let r = prefixed(t);
    if (!r && cls === 'trunk' && /^\d+[A-Z]?$/i.test(t) && knownQL.has(`QL.${t.toUpperCase()}`)) {
      r = { net: 'ql', text: `QL.${t.toUpperCase()}` };
    }
    if (r) out.push(r);
  }
  if (!out.length && name) {
    const m = /^Quốc lộ\s+(\d+[A-Z]?)$/iu.exec(String(name).normalize('NFC').trim());
    if (m && knownQL.has(`QL.${m[1].toUpperCase()}`)) out.push({ net: 'ql', text: `QL.${m[1].toUpperCase()}` });
  }
  const seen = new Set();
  return out
    .filter((r) => !seen.has(r.text) && seen.add(r.text))
    .sort((a, b) => NETWORK_ORDER.indexOf(a.net) - NETWORK_ORDER.indexOf(b.net));
}

/**
 * Thuộc tính biển số của một đoạn: { shield, net, tier } hoặc null.
 * tier "major" = cao tốc, quốc lộ, đường Hồ Chí Minh (hiện từ góc nhìn toàn tỉnh); "minor" = đường tỉnh.
 */
export function shieldOf(road, knownQL) {
  const refs = normalizeRefs(road, knownQL);
  if (!refs.length) return null;
  return {
    shield: refs.map((r) => r.text).join(' · '),
    net: refs[0].net,
    tier: refs[0].net === 'dt' ? 'minor' : 'major',
  };
}

// --- Tên đường ----------------------------------------------------------------

/** Tên không phải tên đường để ghi nhãn: cầu, cống, đập, làn xe, vòng xoay (đoạn ngắn, chỉ làm nhiễu). */
const NOT_A_ROAD = /^(cầu|cống|đập|làn|vòng xoay)(\s|$)/iu;
/** Tên chỉ nhắc lại số hiệu ("Quốc lộ 9", "Quốc lộ 12A, 12C", "Đường tỉnh 584"): đã có biển số. */
const REF_NAME = /^(quốc lộ|tỉnh lộ|đường tỉnh)\s+\d+[a-z]?(\s*,\s*\d+[a-z]?)*$/iu;

/**
 * Tên để ghi dọc theo đường, hoặc null. Giữ nguyên chính tả của OSM; chỉ bỏ các phần không có ích:
 * tên cầu/cống, tên chỉ là con số, và tên nhắc lại số hiệu khi đoạn đó đã có biển số.
 * Tên ghép bằng dấu ";" (nhiều tên trên một đoạn) được tách, lọc, rồi nối lại bằng " · ".
 */
export function roadLabel(name, hasShield) {
  const parts = String(name ?? '')
    .normalize('NFC')
    .split(';')
    .map((s) => s.trim())
    .filter((n) => n && !/^\d+$/.test(n) && !NOT_A_ROAD.test(n) && !(hasShield && REF_NAME.test(n)));
  return [...new Set(parts)].join(' · ') || null;
}

// --- Gộp đoạn thẳng ---------------------------------------------------------

const key = ([x, y]) => `${x},${y}`;
const bearing = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const turn = (a, b) => {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
};

/**
 * Nối các đoạn thẳng có chung điểm đầu/cuối thành chuỗi dài nhất có thể (giống line-merge của turf).
 * Tại ngã ba, đi tiếp theo nhánh ít đổi hướng nhất. Nhãn đặt dọc theo đường cần chuỗi dài:
 * đoạn ngắn rời rạc (cắt ở mỗi cây cầu) làm biển số dày đặc và tên đường không đủ chỗ hiển thị.
 */
export function mergeLines(lines) {
  const parts = lines.filter((l) => l.length >= 2).map((l) => l.slice());
  const used = new Array(parts.length).fill(false);
  const byEnd = new Map();
  parts.forEach((l, i) => {
    for (const p of [l[0], l[l.length - 1]]) {
      const k = key(p);
      if (!byEnd.has(k)) byEnd.set(k, []);
      byEnd.get(k).push(i);
    }
  });

  // Nối thêm vào cuối chuỗi `chain` cho tới khi hết đoạn khớp.
  const extend = (chain) => {
    for (;;) {
      const end = chain[chain.length - 1];
      const dir = bearing(chain[chain.length - 2], end);
      let best = -1;
      let bestTurn = Infinity;
      for (const j of byEnd.get(key(end)) ?? []) {
        if (used[j]) continue;
        const l = parts[j];
        const next = key(l[0]) === key(end) ? l[1] : l[l.length - 2];
        const t = turn(dir, bearing(end, next));
        if (t < bestTurn) [best, bestTurn] = [j, t];
      }
      if (best < 0) return chain;
      used[best] = true;
      const l = parts[best];
      const seg = key(l[0]) === key(end) ? l : l.slice().reverse();
      chain.push(...seg.slice(1));
    }
  };

  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const chain = extend(parts[i].slice());
    out.push(extend(chain.reverse()));
  }
  return out;
}

/** Danh sách đoạn thẳng (mảng tọa độ) của geometry LineString/MultiLineString. */
export const linesOf = (g) => (g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []);

/** Geometry từ danh sách đoạn: một đoạn → LineString, nhiều đoạn → MultiLineString. */
export const lineGeometry = (lines) =>
  lines.length === 1 ? { type: 'LineString', coordinates: lines[0] } : { type: 'MultiLineString', coordinates: lines };
