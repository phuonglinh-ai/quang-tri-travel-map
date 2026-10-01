// Lớp địa điểm: nguồn GeoJSON có gom cụm (cluster) ở mức zoom thấp, ghim theo lớp, vòng chọn.
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { assetPath, type Place } from '../data/places';
import { LAYER_BY_ID } from '../config/layers';
import { COLORS, FONTS } from '../config/theme';
import { addPhotoPin, addPinImage, photoKey } from './icons';

const SOURCE = 'places';
export const PLACE_LAYERS = { cluster: 'place-cluster', clusterCount: 'place-cluster-count', pin: 'place-pin', selected: 'place-selected' };

export function addPlacesLayer(map: MlMap) {
  map.addSource(SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterRadius: 44,
    clusterMaxZoom: 10,
    promoteId: 'id',
  });
  map.addLayer({
    id: PLACE_LAYERS.cluster,
    type: 'circle',
    source: SOURCE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': COLORS.brand,
      'circle-opacity': 0.92,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2.5,
      'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 30, 24],
    },
  });
  map.addLayer({
    id: PLACE_LAYERS.clusterCount,
    type: 'symbol',
    source: SOURCE,
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': FONTS.medium, 'text-size': 13, 'text-allow-overlap': true },
    paint: { 'text-color': '#ffffff' },
  });
  map.addLayer({
    id: PLACE_LAYERS.selected,
    type: 'circle',
    source: SOURCE,
    filter: ['==', ['get', 'id'], ''],
    // Ghim ảnh lớn hơn ghim icon nên vòng chọn cũng lớn hơn.
    paint: { 'circle-radius': ['case', ['get', 'photo'], 28, 23], 'circle-color': COLORS.accent, 'circle-opacity': 0.22, 'circle-stroke-color': COLORS.accent, 'circle-stroke-width': 2 },
  });
  map.addLayer({
    id: PLACE_LAYERS.pin,
    type: 'symbol',
    source: SOURCE,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': ['get', 'icon'],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.75, 11, 1],
      'icon-allow-overlap': true,
      'text-field': ['step', ['zoom'], '', 11.5, ['get', 'name']],
      'text-font': FONTS.medium,
      'text-size': 12,
      'text-offset': ['case', ['get', 'photo'], ['literal', [0, 1.9]], ['literal', [0, 1.5]]],
      // Ghim ảnh vẽ sau cùng (nằm trên ghim icon khi chồng nhau).
      'symbol-sort-key': ['case', ['get', 'photo'], 1, 0],
      'text-anchor': 'top',
      'text-max-width': 9,
      'text-optional': true,
    },
    paint: { 'text-color': COLORS.text, 'text-halo-color': COLORS.halo, 'text-halo-width': 1.5 },
  });
}

// Địa điểm có ảnh nhỏ hiển thị ghim ảnh; chưa có ảnh (hoặc ảnh chưa tải xong/lỗi) dùng ghim icon.
let current: Place[] = [];
const requested = new Set<string>();
let redrawQueued = false;

export function setPlaces(map: MlMap, places: Place[]) {
  current = places;
  draw(map);
  for (const p of places) {
    const img = p.images[0];
    if (!img || requested.has(p.id)) continue;
    requested.add(p.id);
    addPhotoPin(map, p.id, assetPath(img.thumb ?? img.src), LAYER_BY_ID.get(p.layer)!.color).then((key) => {
      if (key) queueRedraw(map);
    });
  }
}

// Gộp nhiều ảnh tải xong gần nhau thành một lần cập nhật nguồn dữ liệu.
function queueRedraw(map: MlMap) {
  if (redrawQueued) return;
  redrawQueued = true;
  setTimeout(() => {
    redrawQueued = false;
    draw(map);
  }, 120);
}

function draw(map: MlMap) {
  const fc: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: current.map((p) => {
      const layer = LAYER_BY_ID.get(p.layer)!;
      const photo = map.hasImage(photoKey(p.id));
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coordinates },
        properties: { id: p.id, name: p.name, photo, icon: photo ? photoKey(p.id) : addPinImage(map, layer.color, p.icon ?? layer.icon) },
      };
    }),
  };
  (map.getSource(SOURCE) as GeoJSONSource).setData(fc);
}

export function setSelectedPlace(map: MlMap, id: string | null) {
  map.setFilter(PLACE_LAYERS.selected, ['==', ['get', 'id'], id ?? '']);
}

export async function zoomIntoCluster(map: MlMap, clusterId: number, center: [number, number]) {
  const zoom = await (map.getSource(SOURCE) as GeoJSONSource).getClusterExpansionZoom(clusterId);
  map.easeTo({ center, zoom: zoom + 0.5 });
}
