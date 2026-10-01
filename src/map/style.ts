// Style MapLibre tự vẽ hoàn toàn từ GeoJSON: không có raster tile hay vector tile bên thứ ba.
import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import { COLORS, FONTS } from '../config/theme';

/** URL tuyệt đối tới file trong public/ (worker của MapLibre không tự phân giải URL tương đối). */
export const assetUrl = (p: string) => `${location.origin}${import.meta.env.BASE_URL}${p}`;

const data = (name: string) => ({ type: 'geojson' as const, data: assetUrl(`data/${name}.geojson`) });

const byZoom = (...stops: (number | ExpressionSpecification)[]): ExpressionSpecification =>
  ['interpolate', ['linear'], ['zoom'], ...stops] as ExpressionSpecification;

const isMajor: ExpressionSpecification = ['match', ['get', 'class'], ['motorway', 'trunk'], true, false];

export const ATTRIBUTION = [
  'Ranh giới hành chính: NXB Tài nguyên, Môi trường và Bản đồ Việt Nam (sapnhap.bando.com.vn), qua <a href="https://github.com/thanglequoc/vietnamese-provinces-database" target="_blank" rel="noopener">vietnamese-provinces-database</a> (MIT)',
  'Đường, sông, hồ, vị trí địa điểm mẫu: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL)',
].join(' · ');

export function buildStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: assetUrl('fonts/{fontstack}/{range}.pbf'),
    sources: {
      land: { ...data('land'), attribution: ATTRIBUTION },
      neighbors: data('neighbors'),
      province: data('province'),
      wards: { ...data('wards'), promoteId: 'code' },
      wardLabels: data('ward-labels'),
      regionLabels: data('region-labels'),
      water: data('water'),
      roads: data('roads'),
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
    ],
  };
}
