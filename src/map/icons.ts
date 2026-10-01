// Vẽ ghim địa điểm (hình tròn màu lớp + emoji) bằng canvas rồi nạp vào MapLibre.
// Glyph PBF không có emoji, nên không dùng text-field cho icon.
import type { Map as MlMap } from 'maplibre-gl';

const SIZE = 34;

export const iconKey = (color: string, emoji: string) => `pin:${color}:${emoji}`;

export function addPinImage(map: MlMap, color: string, emoji: string) {
  const key = iconKey(color, emoji);
  if (map.hasImage(key)) return key;
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  const px = SIZE * ratio;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(ratio, ratio);
  const c = SIZE / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.arc(c, c, c - 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.arc(c, c, c - 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.font = `15px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, c, c + 1);
  map.addImage(key, ctx.getImageData(0, 0, px, px), { pixelRatio: ratio });
  return key;
}

const PHOTO_SIZE = 46;

export const photoKey = (placeId: string) => `photo:${placeId}`;

/**
 * Ghim ảnh: ảnh nhỏ cắt tròn, viền trắng, vòng ngoài theo màu lớp (vẫn nhận ra loại địa điểm).
 * Tải bất đồng bộ; trả về khóa ảnh khi đã nạp vào bản đồ, hoặc null nếu tải lỗi (khi đó giữ ghim icon).
 */
export async function addPhotoPin(map: MlMap, placeId: string, url: string, color: string): Promise<string | null> {
  const key = photoKey(placeId);
  if (map.hasImage(key)) return key;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  const px = PHOTO_SIZE * ratio;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(ratio, ratio);
  const c = PHOTO_SIZE / 2;

  // Vòng màu lớp (có bóng nhẹ) → viền trắng → ảnh.
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.arc(c, c, c - 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.arc(c, c, c - 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c - 6.5, 0, Math.PI * 2);
  ctx.clip();
  // Cắt phần giữa ảnh thành hình vuông.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const d = PHOTO_SIZE - 13;
  ctx.drawImage(img, sx, sy, side, side, 6.5, 6.5, d, d);
  ctx.restore();

  if (!map.hasImage(key)) map.addImage(key, ctx.getImageData(0, 0, px, px), { pixelRatio: ratio });
  return key;
}
