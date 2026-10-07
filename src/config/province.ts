// Cấu hình theo tỉnh. Mọi component đọc tên, mã, vị trí từ đây, không viết cứng.
import data from './province.data.json';
import { getLang, localized } from '../i18n';

export interface FastTravelTarget {
  /** Mã xã/phường (đã xác nhận trong dữ liệu chính thức). */
  wardCode: string;
  label: string;
  /** Tên tiếng Anh chính thức của xã/phường (theo dữ liệu ranh giới). */
  labelEn: string;
}

export const PROVINCE = {
  ...data,
  name: 'Quảng Trị',
  fullName: 'Tỉnh Quảng Trị',
  nameEn: 'Quang Tri',
  fullNameEn: 'Quang Tri Province',
  /** Các đơn vị cấp tỉnh cũ đã hợp nhất thành tỉnh này (dùng cho đoạn giới thiệu); để trống nếu không sáp nhập. */
  mergedFrom: ['tỉnh Quảng Bình', 'tỉnh Quảng Trị'] as readonly string[],
  mergedFromEn: ['Quang Binh Province', 'Quang Tri Province'] as readonly string[],
  /** Bbox dữ liệu chính thức [tây, nam, đông, bắc], dùng cho fitBounds lúc khởi tạo. */
  bbox: [105.606055, 16.300464, 107.385952, 18.090919] as [number, number, number, number],
  /** Nhãn tự đặt cho vùng lân cận (không lấy từ OSM hay Natural Earth). */
  customLabels: [
    { text: 'LÀO', coordinates: [105.95, 16.75] as [number, number] },
    { text: 'Biển Đông', coordinates: [107.75, 17.35] as [number, number] },
  ],
  fastTravel: [
    { wardCode: '18880', label: 'Đồng Hới', labelEn: 'Dong Hoi' },
    { wardCode: '19138', label: 'Phong Nha', labelEn: 'Phong Nha' },
    { wardCode: '19333', label: 'Đông Hà', labelEn: 'Dong Ha' },
    { wardCode: '19429', label: 'Khe Sanh', labelEn: 'Khe Sanh' },
    { wardCode: '19432', label: 'Lao Bảo', labelEn: 'Lao Bao' },
    { wardCode: '19742', label: 'Cồn Cỏ', labelEn: 'Con Co' },
  ] satisfies FastTravelTarget[],
} as const;

/** Tên tỉnh, tên đầy đủ và các tỉnh cũ đã hợp nhất, theo ngôn ngữ đang chọn. */
export const provinceName = () => localized(PROVINCE.name, PROVINCE.nameEn);
export const provinceFullName = () => localized(PROVINCE.fullName, PROVINCE.fullNameEn);
export const provinceMergedFrom = () => (getLang() === 'en' ? PROVINCE.mergedFromEn : PROVINCE.mergedFrom);
export const fastTravelLabel = (f: FastTravelTarget) => localized(f.label, f.labelEn);
