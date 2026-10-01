# Nguồn dữ liệu trong thư mục này

Các file ở đây được **sinh tự động** bằng `npm run data`. Không sửa tay.

| File | Nội dung | Nguồn | Giấy phép |
|---|---|---|---|
| `province.geojson` | Ranh giới tỉnh, dựng bằng cách hợp nhất các xã (khớp tuyệt đối với `wards.geojson`) | NXB Tài nguyên, Môi trường và Bản đồ Việt Nam (sapnhap.bando.com.vn), qua [vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database) | MIT |
| `wards.geojson`, `ward-labels.geojson` | 78 xã, phường, đặc khu và điểm đặt nhãn | Như trên | MIT |
| `neighbors.geojson` | Các tỉnh lân cận (Đà Nẵng giữ nguyên quần đảo Hoàng Sa) | Như trên | MIT |
| `region-labels.geojson` | Điểm đặt nhãn tỉnh lân cận (tên chính thức); nhãn "Lào", "Biển Đông" do dự án tự đặt | Như trên + cấu hình dự án | MIT |
| `land.geojson` | Đất liền ngoài các tỉnh Việt Nam đã có (Lào, Thái Lan…), **chỉ hình học, không có tên** | [Natural Earth](https://www.naturalearthdata.com/) 1:10m | Public domain |
| `roads.geojson` | Đường chính (motorway → tertiary) và đường sắt trong tỉnh | © OpenStreetMap contributors | ODbL |
| `water.geojson` | Sông, kênh (đường) và hồ, sông rộng ≥ 10 ha (vùng) trong tỉnh | © OpenStreetMap contributors | ODbL |
| `places.json` | 96 địa điểm **mẫu** (`isSample: true`), sinh từ `content/places.json` | Tên, vị trí: © OpenStreetMap contributors; mô tả: dự án tự viết | ODbL (phần dữ liệu OSM) |
| `meta.json` | Thời điểm dữ liệu OSM, vùng khung nhìn | — | — |

Ảnh địa điểm (`public/images/places/`): Wikimedia Commons, theo giấy phép CC BY, CC BY-SA hoặc Public domain của từng ảnh (tác giả, giấy phép ghi trong `places.json` và hiển thị trên thẻ); ảnh đã được thu nhỏ.

Font nhãn bản đồ (`public/fonts/`): Noto Sans, SIL Open Font License 1.1 (xem `public/fonts/OFL.txt`).
