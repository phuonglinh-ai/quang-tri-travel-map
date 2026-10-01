// Chạy: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { knownNationalRefs, normalizeRefs, shieldOf, roadLabel, mergeLines } from './road-labels.mjs';

const known = knownNationalRefs(['QL.1', 'QL.9;HCM', 'QL.12A', 'QL.15', 'QL.9E', 'QL1;TL.22']);
const texts = (road) => normalizeRefs(road, known).map((r) => r.text);

test('tập quốc lộ đã biết chỉ gồm số hiệu có tiền tố QL', () => {
  assert.deepEqual([...known].sort(), ['QL.1', 'QL.12A', 'QL.15', 'QL.9', 'QL.9E']);
});

test('giữ nguyên số hiệu đã đúng chuẩn', () => {
  assert.deepEqual(texts({ ref: 'QL.9C', cls: 'primary' }), ['QL.9C']);
  assert.deepEqual(texts({ ref: 'ĐT.570B', cls: 'secondary' }), ['ĐT.570B']);
  assert.deepEqual(texts({ ref: 'CT.01', cls: 'motorway' }), ['CT.01']);
  assert.deepEqual(texts({ ref: 'HCM', cls: 'trunk' }), ['HCM']);
});

test('chuẩn hóa cách viết: thiếu dấu chấm, TL → ĐT, chữ thường, khoảng trắng', () => {
  assert.deepEqual(texts({ ref: 'QL1;TL.22', cls: 'primary' }), ['QL.1', 'ĐT.22']);
  assert.deepEqual(texts({ ref: 'TL 64', cls: 'tertiary' }), ['ĐT.64']);
  assert.deepEqual(texts({ ref: 'ql.9d', cls: 'trunk' }), ['QL.9D']);
  assert.deepEqual(texts({ ref: ' QL.15 ; HCM ', cls: 'trunk' }), ['QL.15', 'HCM']);
});

test('chuỗi tổ hợp (NFD) của chữ Đ vẫn nhận ra', () => {
  assert.deepEqual(texts({ ref: 'ĐT.559'.normalize('NFD'), cls: 'secondary' }), ['ĐT.559']);
});

test('số trơn trên đường trục chỉ thành quốc lộ khi QL tương ứng có thật trong dữ liệu', () => {
  assert.deepEqual(texts({ ref: '15', cls: 'trunk' }), ['QL.15']);
  assert.deepEqual(texts({ ref: '12a', cls: 'trunk' }), ['QL.12A']);
  assert.deepEqual(texts({ ref: '12', cls: 'trunk' }), []); // không có QL.12 trong dữ liệu
});

test('bỏ số hiệu không xác định được loại đường', () => {
  assert.deepEqual(texts({ ref: '573', cls: 'secondary' }), []);
  assert.deepEqual(texts({ ref: '15', cls: 'primary' }), []);
  assert.deepEqual(texts({ ref: 'ĐH.6', cls: 'tertiary' }), []);
  assert.deepEqual(texts({ ref: 'ĐVB', cls: 'secondary' }), []);
  assert.deepEqual(texts({ ref: null, cls: 'trunk' }), []);
});

test('lấy số quốc lộ từ tên khi không có số hiệu, trừ đường cũ', () => {
  assert.deepEqual(texts({ ref: null, name: 'Quốc lộ 9', cls: 'trunk' }), ['QL.9']);
  assert.deepEqual(texts({ ref: null, name: 'Quốc Lộ 9E', cls: 'primary' }), ['QL.9E']);
  assert.deepEqual(texts({ ref: null, name: 'Quốc lộ 9 cũ', cls: 'primary' }), []);
  assert.deepEqual(texts({ ref: null, name: 'Quốc lộ 99', cls: 'trunk' }), []); // không có trong dữ liệu
  assert.deepEqual(texts({ ref: 'QL.1', name: 'Quốc lộ 9', cls: 'trunk' }), ['QL.1']); // ưu tiên ref
});

test('nhiều số hiệu: bỏ trùng, xếp CT → QL → HCM → ĐT', () => {
  assert.deepEqual(texts({ ref: 'HCM;QL.15', cls: 'trunk' }), ['QL.15', 'HCM']);
  assert.deepEqual(texts({ ref: 'QL.9C;ĐT.564;QL.9C', cls: 'primary' }), ['QL.9C', 'ĐT.564']);
  assert.deepEqual(texts({ ref: 'CT.01;CT.02', cls: 'motorway' }), ['CT.01', 'CT.02']);
});

test('biển số: màu theo số hiệu đầu, cấp hiển thị theo loại đường', () => {
  assert.deepEqual(shieldOf({ ref: 'HCM;QL.15', cls: 'trunk' }, known), { shield: 'QL.15 · HCM', net: 'ql', tier: 'major' });
  assert.deepEqual(shieldOf({ ref: 'CT.01;CT.02', cls: 'motorway' }, known), { shield: 'CT.01 · CT.02', net: 'ct', tier: 'major' });
  assert.deepEqual(shieldOf({ ref: 'ĐT.570', cls: 'secondary' }, known), { shield: 'ĐT.570', net: 'dt', tier: 'minor' });
  assert.equal(shieldOf({ ref: '573', cls: 'secondary' }, known), null);
});

test('tên đường: giữ nguyên tên phố, tên tuyến, chính tả gốc', () => {
  assert.equal(roadLabel('Lê Duẩn', true), 'Lê Duẩn');
  assert.equal(roadLabel('Đường Hồ Chí Minh nhánh Tây', true), 'Đường Hồ Chí Minh nhánh Tây');
  assert.equal(roadLabel('Đường cao tốc Vạn Ninh - Cam Lộ', true), 'Đường cao tốc Vạn Ninh - Cam Lộ');
  assert.equal(roadLabel('Võ - Duy -Hàm', false), 'Võ - Duy -Hàm');
  assert.equal(roadLabel('Đèo Ngang', false), 'Đèo Ngang');
  assert.equal(roadLabel('Hầm Đèo Ngang', false), 'Hầm Đèo Ngang');
  assert.equal(roadLabel('Đường 23 Tháng 8', false), 'Đường 23 Tháng 8');
});

test('tên đường: bỏ cầu, cống, đập, làn xe, vòng xoay, tên chỉ là số', () => {
  for (const n of ['Cầu Hiền Lương', 'cầu', 'Cầu vượt Quốc lộ 9B', 'Cống Hộp', 'Đập ngăn mặn sông Hiếu', 'Làn xe máy', 'Vòng xoay Tuyến Tránh Đồng Hới', '4', '', null]) {
    assert.equal(roadLabel(n, false), null, String(n));
  }
  assert.equal(roadLabel('Cầu Giấy phố', false), null); // tên bắt đầu bằng "Cầu" luôn coi là cầu
  assert.equal(roadLabel('Cầuu', false), 'Cầuu'); // chỉ khớp nguyên từ
});

test('tên đường: tên nhắc lại số hiệu chỉ bị bỏ khi đã có biển số', () => {
  assert.equal(roadLabel('Quốc lộ 9', true), null);
  assert.equal(roadLabel('Quốc Lộ 9E', true), null);
  assert.equal(roadLabel('Quốc lộ 12A, 12C, 15', true), null);
  assert.equal(roadLabel('Đường tỉnh 585B', true), null);
  assert.equal(roadLabel('Tỉnh lộ 2B', true), null);
  assert.equal(roadLabel('Quốc lộ 9', false), 'Quốc lộ 9');
  assert.equal(roadLabel('Quốc lộ 9 cũ', true), 'Quốc lộ 9 cũ');
  assert.equal(roadLabel('Quốc lộ 9G (Đường 20)', true), 'Quốc lộ 9G (Đường 20)');
  assert.equal(roadLabel('Đường Huyện 6', false), 'Đường Huyện 6');
});

test('tên đường: tách tên ghép bằng dấu chấm phẩy', () => {
  assert.equal(roadLabel('Đường Hồ Chí Minh nhánh Đông;Quốc lộ 9', true), 'Đường Hồ Chí Minh nhánh Đông');
  assert.equal(roadLabel('Quốc lộ 9;Quốc lộ 1', true), null);
  assert.equal(roadLabel('Lê Lợi;Hùng Vương', false), 'Lê Lợi · Hùng Vương');
  assert.equal(roadLabel('Lê Lợi; Lê Lợi', false), 'Lê Lợi');
});

test('tên đường: chuẩn hóa NFC để so khớp', () => {
  assert.equal(roadLabel('Cầu Đông Hà'.normalize('NFD'), false), null);
  assert.equal(roadLabel('Lê Duẩn'.normalize('NFD'), false), 'Lê Duẩn');
});

test('gộp đoạn: nối đầu–cuối bất kể chiều vẽ', () => {
  const a = [[0, 0], [1, 0]];
  const b = [[2, 0], [1, 0]]; // ngược chiều
  const c = [[2, 0], [3, 0]];
  const out = mergeLines([c, a, b]);
  assert.equal(out.length, 1);
  const xs = out[0].map((p) => p[0]);
  assert.ok(JSON.stringify(xs) === '[0,1,2,3]' || JSON.stringify(xs) === '[3,2,1,0]', xs.join());
});

test('gộp đoạn: tại ngã ba đi theo nhánh thẳng nhất, nhánh rẽ thành chuỗi riêng', () => {
  const main1 = [[0, 0], [1, 0]];
  const branch = [[1, 0], [1, 1]];
  const main2 = [[1, 0], [2, 0]];
  const out = mergeLines([main1, branch, main2]);
  assert.equal(out.length, 2);
  const long = out.find((l) => l.length === 3);
  assert.deepEqual(long.map((p) => p[0]).sort(), [0, 1, 2]);
  assert.ok(long.every((p) => p[1] === 0));
});

test('gộp đoạn: không mất điểm, bỏ đoạn suy biến', () => {
  const lines = [[[0, 0], [1, 1]], [[5, 5], [6, 6]], [[1, 1], [2, 1]], [[9, 9]]];
  const out = mergeLines(lines);
  assert.equal(out.length, 2);
  assert.equal(out.reduce((n, l) => n + l.length, 0), 5); // 3 điểm chuỗi nối + 2 điểm đoạn riêng
});

test('gộp đoạn: vòng khép kín không lặp vô hạn', () => {
  const out = mergeLines([[[0, 0], [1, 0]], [[1, 0], [1, 1]], [[1, 1], [0, 0]]]);
  assert.equal(out.length, 1);
  assert.equal(out[0].length, 4);
});
