// Chủ đề tuyến trải nghiệm. Thêm/bớt chủ đề ở routes.data.json (dùng chung với script build và cấu hình CMS).
import data from './routes.data.json';

export interface RouteTheme {
  id: string;
  label: string;
  icon: string;
  /** Màu đường, ghim số và dải màu của thẻ tuyến. */
  color: string;
}

export const ROUTE_THEMES: RouteTheme[] = data.themes;
export const THEME_BY_ID = new Map(ROUTE_THEMES.map((t) => [t.id, t]));
