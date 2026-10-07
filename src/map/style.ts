// Style MapLibre tự vẽ hoàn toàn từ GeoJSON: không có raster tile hay vector tile bên thứ ba.
import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import { COLORS, FONTS, SHIELDS } from '../config/theme';
import { SHIELD_PREFIX } from './icons';

/** URL tuyệt đối tới file trong public/ (worker của MapLibre không tự phân giải URL tương đối). */
export const assetUrl = (p: string) => `${location.origin}${import.meta.env.BASE_URL}${p}`;

const data = (name: string) => ({ type: 'geojson' as const, data: assetUrl(`data/${name}.geojson`) });

const byZoom = (...stops: (number | ExpressionSpecification)[]): ExpressionSpecification =>
  ['interpolate', ['linear'], ['zoom'], ...stops] as ExpressionSpecification;

const isMajor: ExpressionSpecification = ['match', ['get', 'class'], ['motorway', 'trunk'], true, false];

export function buildStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: assetUrl('fonts/{fontstack}/{range}.pbf'),
    sources: {
      land: data('land'),
      neighbors: data('neighbors'),
      province: data('province'),
      wards: { ...data('wards'), promoteId: 'code' },
      wardLabels: data('ward-labels'),
      regionLabels: data('region-labels'),
      water: data('water'),
      roads: data('roads'),
      roadShields: data('road-shields'),
    },
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': COLORS.sea } },
      { id: 'land-outside', type: 'fill', source: 'land', paint: { 'fill-color': COLORS.landOutside } },
      { id: 'neighbors-fill', type: 'fill', source: 'neighbors', paint: { 'fill-color': COLORS.neighborFill } },
      { id: 'neighbors-line', type: 'line', source: 'neighbors', paint: { 'line-color': COLORS.neighborLine, 'line-width': 0.8 } },
      { id: 'province-fill', type: 'fill', source: 'province', paint: { 'fill-color': COLORS.provinceFill } },

      { id: 'water-area', type: 'fill', source: 'water', filter: ['==', ['get', 'kind'], 'water'], paint: { 'fill-color': COLORS.water } },
      {
        id: 'river',
        type: 'line',
        source: 'water',
        filter: ['==', ['get', 'kind'], 'river'],
        paint: { 'line-color': COLORS.river, 'line-width': byZoom(8, 0.6, 12, 1.6, 15, 3) },
      },

      {
        id: 'ward-fill',
        type: 'fill',
        source: 'wards',
        paint: {
          'fill-color': COLORS.wardHover,
          'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.1, ['boolean', ['feature-state', 'hover'], false], 0.06, 0],
        },
      },
      { id: 'ward-line', type: 'line', source: 'wards', paint: { 'line-color': COLORS.wardLine, 'line-width': byZoom(8, 0.5, 13, 1.2) } },

      {
        id: 'rail',
        type: 'line',
        source: 'roads',
        filter: ['==', ['get', 'kind'], 'rail'],
        paint: { 'line-color': COLORS.rail, 'line-width': byZoom(8, 0.8, 14, 1.6), 'line-dasharray': [3, 2] },
      },
      {
        id: 'road-casing',
        type: 'line',
        source: 'roads',
        minzoom: 10,
        filter: ['==', ['get', 'kind'], 'road'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': COLORS.roadCasing, 'line-width': byZoom(10, ['case', isMajor, 3, 2], 15, ['case', isMajor, 9, 6]) },
      },
      {
        id: 'road',
        type: 'line',
        source: 'roads',
        filter: ['all', ['==', ['get', 'kind'], 'road'], ['any', isMajor, ['>=', ['zoom'], 9]]],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['case', isMajor, COLORS.roadMajor, COLORS.roadMinor],
          'line-width': byZoom(7, ['case', isMajor, 0.8, 0.3], 10, ['case', isMajor, 1.6, 0.7], 15, ['case', isMajor, 6, 4]),
        },
      },

      {
        id: 'ward-selected-line',
        type: 'line',
        source: 'wards',
        filter: ['==', ['get', 'code'], ''],
        paint: { 'line-color': COLORS.brand, 'line-width': 2.5 },
      },
      { id: 'province-line', type: 'line', source: 'province', paint: { 'line-color': COLORS.brand, 'line-width': byZoom(7, 1.5, 12, 3) } },

      {
        id: 'river-label',
        type: 'symbol',
        source: 'water',
        minzoom: 11,
        filter: ['all', ['==', ['get', 'kind'], 'river'], ['has', 'name']],
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONTS.italic, 'text-size': 11 },
        paint: { 'text-color': COLORS.seaLabel, 'text-halo-color': COLORS.halo, 'text-halo-width': 1.2 },
      },
      {
        // Tên đường chạy dọc theo nét đường, chỉ khi phóng to: đường chính từ zoom 12, đường nhỏ hơn từ 13.
        // Nằm dưới nhãn xã và biển số nên nhường chỗ khi chồng nhau.
        id: 'road-name',
        type: 'symbol',
        source: 'roads',
        minzoom: 12,
        filter: ['all', ['has', 'label'], ['any', ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false], ['>=', ['zoom'], 13]]],
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 320,
          'symbol-sort-key': ['match', ['get', 'class'], 'motorway', 0, 'trunk', 1, 'primary', 2, 'secondary', 3, 4],
          'text-field': ['get', 'label'],
          'text-font': FONTS.medium,
          'text-size': byZoom(12, 11, 16, 13.5),
          'text-letter-spacing': 0.02,
          'text-max-angle': 30,
          'text-padding': 2,
        },
        paint: { 'text-color': COLORS.roadLabel, 'text-halo-color': COLORS.roadCasing, 'text-halo-width': 1.4 },
      },
      {
        id: 'region-label',
        type: 'symbol',
        source: 'regionLabels',
        layout: {
          'text-field': ['get', 'text'],
          'text-font': ['match', ['get', 'kind'], 'sea', ['literal', FONTS.italic], ['literal', FONTS.medium]],
          'text-size': ['match', ['get', 'kind'], 'country', 16, 'sea', 15, 13],
          'text-transform': ['match', ['get', 'kind'], 'country', 'uppercase', 'none'],
          'text-letter-spacing': ['match', ['get', 'kind'], 'country', 0.3, 'sea', 0.15, 0.05],
        },
        paint: {
          'text-color': ['match', ['get', 'kind'], 'sea', COLORS.seaLabel, COLORS.textMuted],
          'text-halo-color': ['match', ['get', 'kind'], 'sea', COLORS.sea, COLORS.halo],
          'text-halo-width': 1.2,
        },
      },
      {
        id: 'ward-label',
        type: 'symbol',
        source: 'wardLabels',
        minzoom: 8.5,
        layout: { 'text-field': ['get', 'name'], 'text-font': FONTS.regular, 'text-size': byZoom(8.5, 10, 13, 14), 'text-padding': 4 },
        paint: { 'text-color': COLORS.text, 'text-halo-color': COLORS.halo, 'text-halo-width': 1.4 },
      },
      {
        // Biển số đường (QL.1, CT.01, HCM, ĐT.570…): cao tốc, quốc lộ, đường Hồ Chí Minh hiện từ góc nhìn
        // toàn tỉnh; đường tỉnh từ zoom 10. Luôn dựng đứng để dễ đọc. Đặt trên nhãn xã nên được ưu tiên
        // giữ chỗ khi chồng nhau (MapLibre xếp chỗ cho lớp trên trước).
        id: 'road-shield',
        type: 'symbol',
        source: 'roadShields',
        minzoom: 6.8,
        filter: ['any', ['==', ['get', 'tier'], 'major'], ['>=', ['zoom'], 10]],
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': byZoom(7, 150, 8, 180, 12, 320, 15, 450),
          'symbol-sort-key': ['match', ['get', 'net'], 'ct', 0, 'ql', 1, 'hcm', 1, 2],
          'text-field': ['get', 'shield'],
          'text-font': FONTS.medium,
          'text-size': byZoom(7, 9.5, 8, 10, 13, 11.5),
          'text-letter-spacing': 0.02,
          'text-rotation-alignment': 'viewport',
          'text-pitch-alignment': 'viewport',
          'icon-image': ['concat', SHIELD_PREFIX, ['get', 'net']],
          'icon-text-fit': 'both',
          'icon-text-fit-padding': [1, 3, 1, 3],
          'icon-rotation-alignment': 'viewport',
          'icon-pitch-alignment': 'viewport',
          // Biển số dựng đứng nên độ cong của đường không ảnh hưởng; bỏ giới hạn góc để tuyến quanh co
          // (đường Hồ Chí Minh, QL.9 qua núi) vẫn có biển số.
          'text-max-angle': 180,
          'text-padding': 2,
          'icon-padding': 0,
        },
        paint: {
          'text-color': ['match', ['get', 'net'], 'ct', SHIELDS.ct.text, 'ql', SHIELDS.ql.text, 'hcm', SHIELDS.hcm.text, SHIELDS.dt.text],
        },
      },
    ],
  };
}
