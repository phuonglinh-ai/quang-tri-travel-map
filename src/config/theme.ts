// Bảng màu đề xuất (chưa có bộ nhận diện chính thức — xem CLAUDE.md mục 10).
//  - Xanh Trường Sơn: màu chủ đạo, gợi rừng núi phía tây và Phong Nha – Kẻ Bàng.
//  - Đỏ di tích: màu nhấn, dành cho lớp "Địa chỉ đỏ" và điểm cần chú ý.
//  - Cát biển / xanh biển: nền bản đồ, gợi dải cát và bờ biển phía đông.
export const COLORS = {
  brand: '#1f5c4a',
  accent: '#b3261e',
  sea: '#cfe3ea',
  seaLabel: '#5b8ea3',
  landOutside: '#e6e2d8',
  neighborFill: '#ece8df',
  neighborLine: '#b8b0a0',
  provinceFill: '#fbf8f1',
  wardLine: '#c7bfae',
  wardHover: '#1f5c4a',
  water: '#a9cfe0',
  river: '#8cbfd6',
  roadMajor: '#d9893b',
  roadMinor: '#e8b77f',
  roadCasing: '#ffffff',
  rail: '#6f6a60',
  text: '#2b2a26',
  textMuted: '#6d675c',
  halo: '#fbf8f1',
} as const;

export const FONTS = {
  regular: ['Noto Sans Regular'],
  medium: ['Noto Sans Medium'],
  italic: ['Noto Sans Italic'],
};
