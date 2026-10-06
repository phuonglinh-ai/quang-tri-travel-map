// Lớp tuyến trải nghiệm: đường đi bám theo đường bộ (viền trắng + nét màu chủ đề + mũi tên chỉ chiều),
// đoạn rẽ vào điểm dừng nét đứt, và ghim đánh số 1, 2, 3… Đường nằm dưới nhãn bản đồ; ghim số nằm trên cùng.
import type { ExpressionSpecification, GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { LineProps } from '../data/routes';
import { COLORS, FONTS } from '../config/theme';

const LINES = 'route-lines';
const STOPS = 'route-stops';
const ARROW = 'route-arrow';
export const ROUTE_LAYERS = { stop: 'route-stop', stopActive: 'route-stop-active', stopNum: 'route-stop-num', stopLabel: 'route-stop-label' };

export interface RouteView {
  color: string;
  line: FeatureCollection<import('geojson').LineString, LineProps>;
  stops: { id: string; name: string; coordinates: [number, number] }[];
  activeId: string | null;
}

const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
const byZoom = (...pairs: number[]) => ['interpolate', ['linear'], ['zoom'], ...pairs] as ExpressionSpecification;
const isRoad: ExpressionSpecification = ['==', ['get', 'kind'], 'road'];

// Mũi tên trắng hướng sang phải; MapLibre xoay theo chiều đường.
function addArrowImage(map: MlMap) {
  if (map.hasImage(ARROW)) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  const px = 20 * ratio;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(ratio, ratio);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(7, 4.5);
  ctx.lineTo(13.5, 10);
  ctx.lineTo(7, 15.5);
  ctx.stroke();
  map.addImage(ARROW, ctx.getImageData(0, 0, px, px), { pixelRatio: ratio });
}

export function addRouteLayers(map: MlMap) {
  addArrowImage(map);
  map.addSource(LINES, { type: 'geojson', data: empty });
  map.addSource(STOPS, { type: 'geojson', data: empty, promoteId: 'id' });
  // Đường nằm dưới nhãn sông, tên đường và biển số để các nhãn vẫn đọc được.
  const below = map.getLayer('river-label') ? 'river-label' : undefined;
  const round = { 'line-cap': 'round', 'line-join': 'round' } as const;

  map.addLayer({ id: 'route-casing', type: 'line', source: LINES, filter: isRoad, layout: round, paint: { 'line-color': '#ffffff', 'line-width': byZoom(6, 5, 10, 8.5, 13, 12, 16, 16.5) } }, below);
  map.addLayer({ id: 'route-line', type: 'line', source: LINES, filter: isRoad, layout: round, paint: { 'line-color': ['get', 'color'], 'line-width': byZoom(6, 3, 10, 5.5, 13, 8.5, 16, 12.5) } }, below);
  const notRoad: ExpressionSpecification = ['!=', ['get', 'kind'], 'road'];
  map.addLayer({ id: 'route-dash-casing', type: 'line', source: LINES, filter: notRoad, layout: round, paint: { 'line-color': '#ffffff', 'line-width': byZoom(6, 4, 10, 6, 14, 8.5) } }, below);
  map.addLayer({ id: 'route-dash', type: 'line', source: LINES, filter: notRoad, layout: { 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': byZoom(6, 2, 10, 3, 14, 4.5), 'line-dasharray': [1.3, 1.1] } }, below);
  map.addLayer({
    id: 'route-arrows',
    type: 'symbol',
    source: LINES,
    filter: isRoad,
    // Mũi tên phải nằm gọn trong lòng đường (cao ≈ 0,6 bề rộng nét) nên chỉ hiện khi đường đủ dày.
    minzoom: 10.5,
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 70,
      'icon-image': ARROW,
      'icon-size': byZoom(10.5, 0.34, 13, 0.58, 16, 0.8),
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  }, below);

  // Ghim số: vòng sáng cho điểm đang xem, vòng màu có viền trắng, số, rồi tên (tên nhường chỗ khi chật).
  map.addLayer({ id: ROUTE_LAYERS.stopActive, type: 'circle', source: STOPS, filter: ['==', ['get', 'active'], true], paint: { 'circle-radius': 26, 'circle-color': ['get', 'color'], 'circle-opacity': 0.25 } });
  map.addLayer({
    id: ROUTE_LAYERS.stop,
    type: 'circle',
    source: STOPS,
    paint: {
      'circle-radius': ['case', ['get', 'active'], 18, 15],
      'circle-color': ['get', 'color'],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 3,
    },
  });
  map.addLayer({
    id: ROUTE_LAYERS.stopNum,
    type: 'symbol',
    source: STOPS,
    layout: { 'text-field': ['to-string', ['get', 'n']], 'text-font': FONTS.medium, 'text-size': 14, 'text-allow-overlap': true, 'text-ignore-placement': true },
    paint: { 'text-color': '#ffffff' },
  });
  map.addLayer({
    id: ROUTE_LAYERS.stopLabel,
    type: 'symbol',
    source: STOPS,
    minzoom: 7.5,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONTS.medium,
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 1.5],
      'text-max-width': 9,
      'text-optional': true,
    },
    paint: { 'text-color': COLORS.text, 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
  });
}

let view: RouteView | null = null;

function drawStops(map: MlMap) {
  const fc: FeatureCollection = {
    type: 'FeatureCollection',
    features: (view?.stops ?? []).map((s, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: s.coordinates },
      properties: { id: s.id, name: s.name, n: i + 1, color: view!.color, active: s.id === view!.activeId },
    })),
  };
  (map.getSource(STOPS) as GeoJSONSource).setData(fc);
}

/** Hiện tuyến (hoặc xóa khi null). */
export function setRoute(map: MlMap, next: RouteView | null) {
  view = next;
  const lines: FeatureCollection = {
    type: 'FeatureCollection',
    features: (next?.line.features ?? []).map((f) => ({ ...f, properties: { ...f.properties, color: next!.color } })),
  };
  (map.getSource(LINES) as GeoJSONSource).setData(lines);
  drawStops(map);
}

/** Đổi điểm dừng đang xem (ghim to hơn, có vòng sáng). */
export function setRouteActive(map: MlMap, id: string | null) {
  if (!view) return;
  view = { ...view, activeId: id };
  drawStops(map);
}
