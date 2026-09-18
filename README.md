# Sentinel - Admin dashboard báo cáo bất thường

Dashboard quản trị Vue 3 + Ant Design Vue cho quy trình CRUD báo cáo bất thường.

## Chạy dự án

Cài Node.js 20+ trước, sau đó mở terminal tại thư mục project:

```bash
npm install
npm run dev
```

Mở URL Vite hiển thị trong terminal (thường là `http://localhost:5173`).

## Có sẵn

- Tổng quan KPI: tổng báo cáo, chờ xử lý, đang điều tra, đã giải quyết.
- Tìm kiếm theo mã, tiêu đề, địa điểm và người xử lý.
- Lọc theo trạng thái và mức độ.
- Thêm, sửa, xoá báo cáo bằng modal.
- Phân trang và responsive cho màn hình nhỏ.

Dữ liệu hiện được lưu trong state trình duyệt để phục vụ demo giao diện. Có thể thay `reports` trong `src/App.vue` bằng API backend khi tích hợp thật.
