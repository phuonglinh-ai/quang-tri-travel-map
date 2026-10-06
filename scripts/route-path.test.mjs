import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, snap, shortestPath, routeThrough } from './route-path.mjs';

const road = (coordinates) => ({ type: 'Feature', properties: { kind: 'road' }, geometry: { type: 'LineString', coordinates } });
// Hình chữ thập: đường ngang qua (0,0)–(0.1,0), đường dọc (0.05,0)–(0.05,0.1) cắt nhau tại nút (0.05,0);
// thêm một đoạn đường tách biệt, không nối với mạng chính.
const features = [
  road([[0, 0], [0.05, 0], [0.1, 0]]),
  road([[0.05, 0], [0.05, 0.05], [0.05, 0.1]]),
  road([[0.3, 0.3], [0.31, 0.3]]),
  { type: 'Feature', properties: { kind: 'rail' }, geometry: { type: 'LineString', coordinates: [[0, 0.02], [0.1, 0.02]] } },
];
const graph = buildGraph(features);
const KM_PER_DEG = 111.19;

test('đồ thị bỏ qua đường sắt và nối các đỉnh trùng tọa độ', () => {
  assert.equal(graph.coords.length, 7); // 3 + 3 + 2 nút, nút giao dùng chung
  assert.equal(graph.edges.length, 5);
});

test('snap chiếu điểm xuống đoạn đường gần nhất', () => {
  const s = snap(graph, [0.02, 0.001]);
  assert.ok(Math.abs(s.point[0] - 0.02) < 1e-9 && Math.abs(s.point[1]) < 1e-9);
  assert.ok(Math.abs(s.off - 0.001 * KM_PER_DEG) < 0.01);
});

test('đường ngắn nhất đi qua nút giao và bám theo đường', () => {
  const a = snap(graph, [0.01, 0]);
  const b = snap(graph, [0.05, 0.09]);
  const p = shortestPath(graph, a, b);
  assert.ok(Math.abs(p.km - (0.04 + 0.09) * KM_PER_DEG) < 0.2);
  assert.deepEqual(p.coords[0], a.point);
  assert.deepEqual(p.coords[p.coords.length - 1], b.point);
  assert.ok(p.coords.some(([x, y]) => x === 0.05 && y === 0), 'phải đi qua nút giao');
});

test('hai điểm trên cùng một đoạn đường nối thẳng với nhau', () => {
  const a = snap(graph, [0.01, 0]);
  const b = snap(graph, [0.03, 0]);
  const p = shortestPath(graph, a, b);
  assert.equal(p.coords.length, 2);
  assert.ok(Math.abs(p.km - 0.02 * KM_PER_DEG) < 0.01);
});

test('không có đường nối giữa hai thành phần rời nhau', () => {
  const p = shortestPath(graph, snap(graph, [0.01, 0]), snap(graph, [0.3, 0.3]));
  assert.equal(p, null);
});

test('routeThrough: đoạn rẽ, đường bám đường và km từng chặng', () => {
  const { features: fs, legs } = routeThrough(graph, [[0.01, 0.002], [0.052, 0.09]]);
  const kinds = fs.map((f) => f.properties.kind).sort();
  assert.deepEqual(kinds, ['road', 'spur', 'spur']);
  assert.equal(legs.length, 1);
  assert.equal(legs[0].approx, false);
  // Quãng đường = phần bám đường + hai đoạn rẽ (0.002° và 0.002° theo kinh độ).
  assert.ok(legs[0].km > (0.04 + 0.09 + 0.002) * KM_PER_DEG);
});

test('routeThrough: điểm dừng sát đường không sinh đoạn rẽ', () => {
  const { features: fs } = routeThrough(graph, [[0.01, 0], [0.05, 0.09]]);
  assert.ok(!fs.some((f) => f.properties.kind === 'spur'));
});

test('routeThrough: không nối được thì vẽ đường thẳng và đánh dấu gần đúng', () => {
  const { features: fs, legs } = routeThrough(graph, [[0.01, 0], [0.3, 0.3]]);
  assert.ok(fs.some((f) => f.properties.kind === 'straight'));
  assert.equal(legs[0].approx, true);
});
