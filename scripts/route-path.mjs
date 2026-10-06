// Tìm đường đi giữa các điểm dừng của một tuyến trải nghiệm, trên mạng đường OSM của chính dự án
// (public/data/roads.geojson). Chạy lúc build, không dùng dịch vụ chỉ đường bên ngoài, nên kết quả
// luôn trùng khít với các nét đường vẽ trên bản đồ và không phụ thuộc mạng.
//
// Mỗi điểm dừng được chiếu xuống đoạn đường gần nhất. Phần nối từ điểm dừng ra đường ("đoạn rẽ")
// là đường thẳng và được đánh dấu riêng để vẽ nét đứt; phần còn lại bám theo đường thật.
import { distanceKm } from './lib.mjs';

const round5 = (n) => Math.round(n * 1e5) / 1e5;
const nodeKey = ([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`;

/** Điểm dừng cách đường xa hơn mức này (km) thì không nối vào mạng đường mà vẽ đường thẳng. */
export const MAX_SNAP_KM = 3;
/** Đoạn rẽ ngắn hơn mức này (km) coi như điểm dừng nằm sát đường, không vẽ riêng. */
export const MIN_SPUR_KM = 0.03;

/** Dựng đồ thị từ các Feature đường (kind = "road"); đỉnh trùng tọa độ (làm tròn 1 m) là một nút. */
export function buildGraph(features) {
  const index = new Map();
  const coords = [];
  const adj = [];
  const edges = [];
  const nodeId = (c) => {
    const k = nodeKey(c);
    let i = index.get(k);
    if (i === undefined) {
      i = coords.length;
      index.set(k, i);
      coords.push(c);
      adj.push([]);
    }
    return i;
  };
  for (const f of features) {
    if (f.properties?.kind !== 'road') continue;
    const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const a = nodeId(line[i - 1]);
        const b = nodeId(line[i]);
        if (a === b) continue;
        const km = distanceKm(coords[a], coords[b]);
        adj[a].push([b, km]);
        adj[b].push([a, km]);
        edges.push([a, b]);
      }
    }
  }
  return { coords, adj, edges };
}

/** Chiếu điểm p xuống đoạn đường gần nhất: { point, edge, a, b, da, db, off } (da/db: km từ điểm chiếu tới hai đầu đoạn). */
export function snap(graph, p) {
  const k = Math.cos((p[1] * Math.PI) / 180);
  let best = null;
  for (let i = 0; i < graph.edges.length; i++) {
    const [a, b] = graph.edges[i];
    const A = graph.coords[a];
    const B = graph.coords[b];
    const dx = (B[0] - A[0]) * k;
    const dy = B[1] - A[1];
    const len2 = dx * dx + dy * dy;
    let t = len2 ? (((p[0] - A[0]) * k) * dx + (p[1] - A[1]) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const q = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
    const d2 = ((p[0] - q[0]) * k) ** 2 + (p[1] - q[1]) ** 2;
    if (!best || d2 < best.d2) best = { d2, edge: i, q };
  }
  if (!best) return null;
  const [a, b] = graph.edges[best.edge];
  return {
    point: best.q,
    edge: best.edge,
    a,
    b,
    da: distanceKm(best.q, graph.coords[a]),
    db: distanceKm(best.q, graph.coords[b]),
    off: distanceKm(p, best.q),
  };
}

/** Hàng đợi ưu tiên nhị phân tối thiểu theo phần tử đầu của mỗi cặp [khoảng cách, nút]. */
class MinHeap {
  items = [];
  get size() {
    return this.items.length;
  }
  push(item) {
    const h = this.items;
    h.push(item);
    let i = h.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (h[parent][0] <= h[i][0]) break;
      [h[parent], h[i]] = [h[i], h[parent]];
      i = parent;
    }
  }
  pop() {
    const h = this.items;
    const top = h[0];
    const last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < h.length && h[l][0] < h[m][0]) m = l;
        if (r < h.length && h[r][0] < h[m][0]) m = r;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Đường ngắn nhất giữa hai điểm đã chiếu: { coords, km } hoặc null nếu không nối được. */
export function shortestPath(graph, s, t) {
  if (s.edge === t.edge) {
    return { coords: [s.point, t.point], km: distanceKm(s.point, t.point) };
  }
  const n = graph.coords.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-2);
  const done = new Uint8Array(n);
  const heap = new MinHeap();
  const seed = (node, d) => {
    if (d < dist[node]) {
      dist[node] = d;
      prev[node] = -1;
      heap.push([d, node]);
    }
  };
  seed(s.a, s.da);
  seed(s.b, s.db);
  while (heap.size) {
    const [d, u] = heap.pop();
    if (done[u]) continue;
    done[u] = 1;
    if (done[t.a] && done[t.b]) break;
    for (const [v, w] of graph.adj[u]) {
      if (!done[v] && d + w < dist[v]) {
        dist[v] = d + w;
        prev[v] = u;
        heap.push([dist[v], v]);
      }
    }
  }
  const viaA = dist[t.a] + t.da;
  const viaB = dist[t.b] + t.db;
  const end = viaA <= viaB ? t.a : t.b;
  const km = Math.min(viaA, viaB);
  if (!Number.isFinite(km)) return null;
  const nodes = [];
  for (let u = end; u >= 0; u = prev[u]) nodes.push(u);
  nodes.reverse();
  return { coords: [s.point, ...nodes.map((u) => graph.coords[u]), t.point], km };
}

/**
 * Dựng hình học cho một tuyến đi qua các điểm dừng theo thứ tự.
 * Trả về { features, legs }:
 *  - features: LineString, `kind` = "road" (bám đường, có `leg`), "spur" (đoạn rẽ vào điểm dừng, có `stop`)
 *    hoặc "straight" (không nối được vào mạng đường, vẽ đường thẳng, có `leg`);
 *  - legs: km giữa từng cặp điểm dừng liên tiếp; `approx` = true nếu phải dùng đường thẳng.
 */
export function routeThrough(graph, stops) {
  const snaps = stops.map((p) => {
    const s = snap(graph, p);
    return s && s.off <= MAX_SNAP_KM ? s : null;
  });
  const features = [];
  const legs = [];
  const line = (kind, coordinates, props) => ({
    type: 'Feature',
    properties: { kind, ...props },
    geometry: { type: 'LineString', coordinates: coordinates.map(([x, y]) => [round5(x), round5(y)]) },
  });

  snaps.forEach((s, i) => {
    if (s && s.off > MIN_SPUR_KM) features.push(line('spur', [stops[i], s.point], { stop: i }));
  });

  for (let i = 0; i + 1 < stops.length; i++) {
    const a = snaps[i];
    const b = snaps[i + 1];
    const path = a && b ? shortestPath(graph, a, b) : null;
    if (path) {
      features.push(line('road', path.coords, { leg: i }));
      legs.push({ km: path.km + a.off + b.off, approx: false });
    } else {
      const km = distanceKm(stops[i], stops[i + 1]);
      features.push(line('straight', [stops[i], stops[i + 1]], { leg: i }));
      legs.push({ km, approx: true });
    }
  }
  return { features, legs };
}
