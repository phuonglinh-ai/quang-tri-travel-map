// Khởi tạo MapLibre và điều hướng hai cấp: Tỉnh → Xã/phường. Bản đồ chỉ nhận lệnh (select, fly)
// và phát sự kiện (bấm xã, bấm địa điểm); trạng thái nằm ở store.
import * as maplibregl from 'maplibre-gl';
import type { LngLatBoundsLike, MapGeoJSONFeature, PaddingOptions } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 tự tìm worker bằng đường dẫn động mà Vite không phân tích được, nên phải để Vite
// đóng gói worker (kèm module dùng chung) rồi chỉ định URL một cách tường minh.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Point } from 'geojson';
import { PROVINCE } from '../config/province';
import { buildStyle } from './style';
import { addPlacesLayer, PLACE_LAYERS, setSelectedPlace, zoomIntoCluster } from './places-layer';
import { addShieldImage } from './icons';

export { setPlaces } from './places-layer';

export interface WardProps {
  code: string;
  name: string;
  fullName: string;
  areaKm2: number;
}
export type WardFeature = Feature<Polygon | MultiPolygon, WardProps>;

type Bbox = [number, number, number, number];

const PAD = PROVINCE.viewPaddingDeg;
const [W, S, E, N] = PROVINCE.bbox;
export const PROVINCE_BOUNDS: LngLatBoundsLike = [[W, S], [E, N]];
const MAX_BOUNDS: LngLatBoundsLike = [[W - PAD, S - PAD], [E + PAD, N + PAD]];
const DURATION = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;

function bboxOf(f: WardFeature): Bbox {
  const b: Bbox = [Infinity, Infinity, -Infinity, -Infinity];
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const [x, y] of polys.flat(2)) {
    b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y);
    b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
  }
  return b;
}

export async function loadWards() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/wards.geojson`);
  return (await res.json()) as FeatureCollection<Polygon | MultiPolygon, WardProps>;
}

export interface MapOptions {
  wards: FeatureCollection<Polygon | MultiPolygon, WardProps>;
  /** Lề khi di chuyển camera, để phần bị panel che không tính là vùng nhìn thấy. */
  padding: () => PaddingOptions;
  onWardClick: (code: string) => void;
  onPlaceClick: (id: string) => void;
}

export interface TravelMap {
  map: maplibregl.Map;
  wards: Map<string, WardFeature>;
  /** Tô sáng xã; `fit` = đưa camera tới xã (hoặc về toàn tỉnh nếu code = null). */
  showWard(code: string | null, fit?: boolean): void;
  showPlace(id: string | null, coordinates?: [number, number], zoom?: number): void;
  fitProvince(): void;
}

maplibregl.setWorkerUrl(workerUrl);

export async function createMap(container: HTMLElement, opts: MapOptions): Promise<TravelMap> {
  const wardsFc = opts.wards;
  const wards = new Map(wardsFc.features.map((f) => [f.properties.code, f]));
  const bboxes = new Map([...wards].map(([code, f]) => [code, bboxOf(f)]));

  const style = buildStyle();
  style.sources.wards = { type: 'geojson', data: wardsFc, promoteId: 'code' };

  const map = new maplibregl.Map({
    container,
    style,
    bounds: PROVINCE_BOUNDS,
    fitBoundsOptions: { padding: opts.padding() },
    maxBounds: MAX_BOUNDS,
    minZoom: 6,
    maxZoom: 17,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
  });
  map.touchZoomRotate.disableRotation();
  // Ảnh nền biển số đường vẽ bằng canvas, tạo khi style cần tới lần đầu.
  map.setMissingStyleImageResolver((id) => void addShieldImage(map, id));
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

  let selectedWard: string | null = null;
  let hovered: string | null = null;
  const setState = (code: string | null, s: Record<string, boolean>) => {
    if (code) map.setFeatureState({ source: 'wards', id: code }, s);
  };

  const fitProvince = () => map.fitBounds(PROVINCE_BOUNDS, { padding: opts.padding(), duration: DURATION });

  function showWard(code: string | null, fit = true) {
    if (code && !wards.has(code)) code = null;
    setState(selectedWard, { selected: false });
    selectedWard = code;
    setState(selectedWard, { selected: true });
    map.setFilter('ward-selected-line', ['==', ['get', 'code'], selectedWard ?? '']);
    if (!fit) return;
    if (selectedWard) {
      const [w, s, e, n] = bboxes.get(selectedWard)!;
      map.fitBounds([[w, s], [e, n]], { padding: opts.padding(), maxZoom: 14, duration: DURATION });
    } else {
      fitProvince();
    }
  }

  function showPlace(id: string | null, coordinates?: [number, number], zoom?: number) {
    setSelectedPlace(map, id);
    if (id && coordinates) {
      map.easeTo({ center: coordinates, zoom: zoom ?? Math.max(map.getZoom(), 13), padding: opts.padding(), duration: DURATION });
    }
  }

  // --- Tương tác -------------------------------------------------------------
  const pointer = (on: boolean) => (map.getCanvas().style.cursor = on ? 'pointer' : '');
  const idOf = (e: { features?: MapGeoJSONFeature[] }) => (e.features?.[0]?.id as string | undefined) ?? null;

  map.on('mousemove', 'ward-fill', (e) => {
    const code = idOf(e);
    if (code === hovered) return;
    setState(hovered, { hover: false });
    hovered = code;
    setState(hovered, { hover: true });
  });
  map.on('mouseleave', 'ward-fill', () => {
    setState(hovered, { hover: false });
    hovered = null;
  });

  const tooltip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 18, className: 'pin-tooltip' });
  map.on('mouseenter', PLACE_LAYERS.pin, (e) => {
    pointer(true);
    const f = e.features?.[0];
    if (!f || matchMedia('(hover: none)').matches) return;
    tooltip.setLngLat((f.geometry as Point).coordinates as [number, number]).setText(String(f.properties.name)).addTo(map);
  });
  map.on('mouseleave', PLACE_LAYERS.pin, () => {
    pointer(false);
    tooltip.remove();
  });
  map.on('mouseenter', PLACE_LAYERS.cluster, () => pointer(true));
  map.on('mouseleave', PLACE_LAYERS.cluster, () => pointer(false));

  // Một lần bấm chỉ xử lý lớp trên cùng: địa điểm > cụm > xã.
  map.on('click', (e) => {
    const [hit] = map.queryRenderedFeatures(e.point, { layers: [PLACE_LAYERS.pin, PLACE_LAYERS.cluster, 'ward-fill'] });
    if (!hit) return;
    if (hit.layer.id === PLACE_LAYERS.pin) {
      tooltip.remove();
      opts.onPlaceClick(String(hit.properties.id));
    } else if (hit.layer.id === PLACE_LAYERS.cluster) {
      zoomIntoCluster(map, hit.properties.cluster_id as number, (hit.geometry as Point).coordinates as [number, number]);
    } else if (hit.id != null && hit.id !== selectedWard) {
      opts.onWardClick(String(hit.id));
    }
  });

  await new Promise<void>((resolve) => map.once('load', () => resolve()));
  addPlacesLayer(map);

  return { map, wards, showWard, showPlace, fitProvince };
}
