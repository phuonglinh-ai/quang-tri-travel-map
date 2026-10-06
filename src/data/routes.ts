// Mô hình dữ liệu tuyến trải nghiệm (public/data/routes.json, sinh bởi scripts/build-routes.mjs).
import type { FeatureCollection, LineString } from 'geojson';

export interface RouteStop {
  /** Id địa điểm. */
  place: string;
  note?: string;
}

export interface RouteLeg {
  /** Quãng đường (km) tới điểm dừng kế tiếp, ước tính theo mạng đường OSM. */
  km: number;
  /** true nếu không nối được vào mạng đường nên chỉ là khoảng cách đường chim bay. */
  approx: boolean;
}

export interface LineProps {
  /** road: bám đường; spur: đoạn rẽ vào điểm dừng; straight: đường thẳng dự phòng. */
  kind: 'road' | 'spur' | 'straight';
  leg?: number;
  stop?: number;
}

export interface TravelRoute {
  id: string;
  name: string;
  theme: string;
  summary: string;
  duration?: string;
  audience?: string;
  isSample: boolean;
  stops: RouteStop[];
  legs: RouteLeg[];
  totalKm: number;
  /** [tây, nam, đông, bắc] */
  bbox: [number, number, number, number];
  line: FeatureCollection<LineString, LineProps>;
}

export async function loadRoutes(): Promise<TravelRoute[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/routes.json`);
    if (!res.ok) return [];
    const routes = (await res.json()) as TravelRoute[];
    return Array.isArray(routes) ? routes : [];
  } catch {
    return []; // thiếu dữ liệu tuyến không được làm hỏng cả bản đồ
  }
}

/** Liên kết chỉ đường nhiều điểm trên Google Maps (tối đa 9 điểm trung gian nên tuyến giới hạn 11 điểm dừng). */
export function googleMapsUrl(points: [number, number][]): string {
  const ll = ([lon, lat]: [number, number]) => `${lat},${lon}`;
  const params = new URLSearchParams({ api: '1', travelmode: 'driving', origin: ll(points[0]), destination: ll(points[points.length - 1]) });
  if (points.length > 2) params.set('waypoints', points.slice(1, -1).map(ll).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Hình thu nhỏ của tuyến (SVG) cho thẻ tuyến: đường đi và các điểm dừng, giữ đúng tỷ lệ địa lý. */
export function routeShapeSvg(route: TravelRoute, stops: [number, number][], color: string, size = 56): string {
  const [w, s, , n] = route.bbox;
  const cos = Math.cos((((s + n) / 2) * Math.PI) / 180);
  const pad = 5;
  const spanX = (route.bbox[2] - w) * cos || 1e-6;
  const spanY = n - s || 1e-6;
  const scale = (size - 2 * pad) / Math.max(spanX, spanY);
  const offX = (size - spanX * scale) / 2;
  const offY = (size - spanY * scale) / 2;
  const pt = ([x, y]: [number, number]) => [(offX + (x - w) * cos * scale).toFixed(1), (offY + (n - y) * scale).toFixed(1)];

  const pts = route.line.features.filter((f) => f.properties.kind !== 'spur').flatMap((f) => f.geometry.coordinates as [number, number][]);
  const step = Math.max(1, Math.ceil(pts.length / 60));
  const sampled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
  const path = sampled.map((p, i) => `${i ? 'L' : 'M'}${pt(p).join(' ')}`).join('');
  const dots = stops
    .map((p, i) => {
      const [x, y] = pt(p);
      const end = i === 0 || i === stops.length - 1;
      return `<circle cx="${x}" cy="${y}" r="${end ? 3.6 : 2.4}" fill="${end ? color : '#fff'}" stroke="${color}" stroke-width="1.4"/>`;
    })
    .join('');
  return `<svg class="rc-shape" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><path d="${path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}
