// Cấu hình theo tỉnh. Mọi component đọc tên, mã, vị trí từ đây, không viết cứng.
import data from './province.data.json';

export interface FastTravelTarget {
  /** Mã xã/phường (đã xác nhận trong dữ liệu chính thức). */
  wardCode: string;
  label: string;
}

export const PROVINCE = {
  ...data,
  name: 'Quảng Trị',
  fullName: 'Tỉnh Quảng Trị',
  /** Các đơn vị cấp tỉnh cũ đã hợp nhất thành tỉnh này (dùng cho đoạn giới thiệu); để trống nếu không sáp nhập. */
  mergedFrom: ['tỉnh Quảng Bình', 'tỉnh Quảng Trị'] as readonly string[],
  /** Bbox dữ liệu chính thức [tây, nam, đông, bắc], dùng cho fitBounds lúc khởi tạo. */
  bbox: [105.606055, 16.300464, 107.385952, 18.090919] as [number, number, number, number],
  /** Nhãn tự đặt cho vùng lân cận (không lấy từ OSM hay Natural Earth). */
  customLabels: [
    { text: 'LÀO', coordinates: [105.95, 16.75] as [number, number] },
    { text: 'Biển Đông', coordinates: [107.75, 17.35] as [number, number] },
  ],
  fastTravel: [
    { wardCode: '18880', label: 'Đồng Hới' },
    { wardCode: '19138', label: 'Phong Nha' },
    { wardCode: '19333', label: 'Đông Hà' },
    { wardCode: '19429', label: 'Khe Sanh' },
    { wardCode: '19432', label: 'Lao Bảo' },
    { wardCode: '19742', label: 'Cồn Cỏ' },
  ] satisfies FastTravelTarget[],
} as const;
