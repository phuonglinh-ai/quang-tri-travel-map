// Danh sách nhóm và lớp địa điểm. Thêm/bớt lớp ở layers.data.json (dùng chung với script build).
import data from './layers.data.json';

export interface LayerGroup {
  id: string;
  label: string;
}

export interface LayerDef {
  id: string;
  group: string;
  label: string;
  icon: string;
  /** Màu nền của ghim trên bản đồ. */
  color: string;
  /** Lớp chưa có dữ liệu chính thức: hiện ghi chú thay cho bộ đếm. */
  pendingNote?: string;
}

export const GROUPS: LayerGroup[] = data.groups;
export const LAYERS: LayerDef[] = data.layers;
export const LAYER_BY_ID = new Map(LAYERS.map((l) => [l.id, l]));
