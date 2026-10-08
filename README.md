# DopiPOS - Phần Mềm Quản Lý Bán Hàng & F&B

**DopiPOS** là phần mềm quản lý bán hàng chuyên nghiệp, hiện đại và tốc độ cao dành cho hộ kinh doanh, cửa hàng bán lẻ và ngành dịch vụ ăn uống (F&B).

Hệ thống được xây dựng trên nền tảng **React + TypeScript + Vite + Express + Cloud Firestore & Firebase Authentication**.

---

## 1. Tính Năng Nổi Bật

### 🛒 Bán hàng POS siêu tốc (`/pos`)
- Giao diện 2 cột tối ưu: danh mục món, tìm kiếm theo tên/SKU, chọn nhanh số lượng.
- Hỗ trợ F&B Topping / Options: thêm trân châu, thạch, kem cheese,... tính tiền tự động theo từng món.
- Phục vụ linh hoạt: Tại quán (chọn bàn), Mang đi (Takeaway), Giao hàng (Delivery).
- Giảm giá theo đơn hàng, phụ thu, ghi chú đơn.
- Thanh toán linh hoạt: Tiền mặt, Chuyển khoản ngân hàng, hoặc Kết hợp Tiền mặt + Chuyển khoản.
- Tự động tính tiền thừa trả khách khi đưa tiền mặt, gợi ý mệnh giá tiền nhanh (50k, 100k, 200k, 500k).
- Trừ kho tự động ngay khi thanh toán, in hóa đơn nhiệt và xem chi tiết tức thì.
- Cơ chế khóa nút submit (`isSubmitting`) ngăn chặn tạo đơn trùng lặp khi bấm liên tiếp.

### 🍽️ Quản lý Bàn & Phòng F&B (`/tables`)
- Phân chia khu vực linh hoạt (Khu máy lạnh, Tầng 1, Sân vườn, Tầng thượng,...).
- Trạng thái bàn trực quan theo thời gian thực: Bàn trống, Đang có khách, Chờ tính tiền.
- Bấm vào bàn để mở nhanh giao diện POS bán hàng cho bàn tương ứng.

### 📦 Quản lý Sản phẩm & Danh mục (`/products`, `/categories`)
- Quản lý mã SKU, đơn vị tính, giá vốn, giá bán, tồn kho, cảnh báo tồn kho tối thiểu.
- Đính kèm hình ảnh và danh sách topping món cho ngành F&B.
- Bộ lọc danh mục, tìm kiếm và phân loại nhanh.

### 🏭 Quản lý Kho & Biến động tồn (`/inventory`)
- Nhập kho, xuất kho, kiểm kho điều chỉnh số lượng thực tế.
- Lưu vết lịch sử biến động kho (`inventoryTransactions`) cho mọi đơn bán hàng, hủy đơn hoặc điều chỉnh kho.
- Cảnh báo tồn kho thấp và sản phẩm sắp hết hàng.

### 👥 Quản lý Khách hàng (`/customers`)
- Danh bạ khách quen, lưu số điện thoại, địa chỉ giao hàng và ghi chú khẩu vị.
- Tự động tích lũy tổng số đơn và tổng tiền chi tiêu qua từng giao dịch.

### 📊 Báo cáo Doanh thu & Lợi nhuận (`/reports`)
- Lọc theo ngày: Hôm nay, Hôm qua, 7 ngày qua, 30 ngày qua hoặc Khoảng ngày tùy chọn.
- Thống kê doanh thu tiền mặt vs chuyển khoản, số đơn hoàn thành, số đơn hủy.
- Thống kê mặt hàng bán chạy và tỷ trọng doanh thu theo danh mục.
- Xuất báo cáo chi tiết ra file Excel/CSV bằng 1 cú click.

### 🔑 Mô hình Gói dịch vụ & Mã kích hoạt (`/subscription`)
- **Gói 1 tháng**: 39.000 VNĐ (30 ngày).
- **Gói 3 tháng**: 79.000 VNĐ (90 ngày).
- Kích hoạt qua mã 15 ký tự (A-Z và 0-9) sinh ngẫu nhiên từ hệ thống backend an toàn.
- **Cơ chế cộng dồn thời hạn**: Nếu tài khoản vẫn còn hạn sử dụng, hệ thống sẽ tự động cộng tiếp số ngày vào ngày hết hạn hiện tại mà không làm mất thời gian cũ.
- Hộp thoại "Liên hệ Dopi để mua code" hỗ trợ kết nối trực tiếp qua Zalo, Facebook, Messenger, Hotline, Email.

### 🛡️ Khu vực Quản trị Admin (`/admin`)
- Dành riêng cho tài khoản Quản trị viên (`nhgb2605@gmail.com` hoặc role `admin`).
- Tổng quan hệ thống: Tổng người dùng, gói đang hoạt động, mã đã tạo/chưa dùng/đã dùng.
- Công cụ sinh mã hàng loạt: Tạo 10, 50, 100 hoặc 500 mã 15 ký tự trong một lần bấm.
- Quản lý mã: Khóa/mở khóa mã, tra cứu người dùng và thời điểm kích hoạt mã, xuất danh sách mã ra CSV.
- Cấu hình thông tin liên hệ mua code (Zalo, Facebook, Hotline, Email) lưu trực tiếp trong Firestore.

---

## 2. Kiến Trúc Bảo Mật & Security Rules

1. **Nguyên tắc Default Deny**: Tất cả các đường dẫn tài liệu không khai báo rõ ràng đều bị từ chối truy cập.
2. **Cô lập dữ liệu cửa hàng (Data Isolation)**: Người dùng tài khoản A chỉ đọc và ghi dữ liệu có `storeId == userA.uid`. Tuyệt đối không thể đọc hay sửa sản phẩm, đơn hàng, khách hàng của cửa hàng khác.
3. **Bảo mật Mã kích hoạt (Activation Code Shield)**: Khách hàng thông thường KHÔNG thể query hay đọc danh sách mã trong collection `/activationCodes`. Việc kiểm tra, xác thực và đổi trạng thái mã được xử lý qua **Atomic Transaction** trên endpoint backend (`/api/activation/redeem`), chống hoàn toàn race condition nếu 2 thiết bị nhập cùng lúc.
4. **Bảo vệ quyền Admin**: Người dùng không thể tự nâng cấp trường `role` của chính mình lên `admin`. Quyền admin được kiểm tra dựa trên email ủy quyền đã xác minh hoặc tài liệu quản trị viên.

---

## 3. Cài Đặt & Chạy Môi Trường Local

### Yêu cầu:
- Node.js >= 18
- npm hoặc yarn

### Cài đặt dependencies:
```bash
npm install
```

### Chạy chế độ Development:
```bash
npm run dev
```
Ứng dụng sẽ khởi chạy tại `http://localhost:3000`.

### Build cho môi trường Production:
```bash
npm run build
npm start
```

---

## 4. Cấu Hình Firebase

File cấu hình Firebase được đặt tại `firebase-applet-config.json`:
```json
{
  "projectId": "YOUR_PROJECT_ID",
  "appId": "YOUR_APP_ID",
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_AUTH_DOMAIN",
  "firestoreDatabaseId": "YOUR_FIRESTORE_DB_ID",
  "storageBucket": "YOUR_STORAGE_BUCKET",
  "messagingSenderId": "YOUR_SENDER_ID"
}
```

Các luật bảo mật đã được biên soạn và triển khai tại `firestore.rules`.

---

## 5. Dữ Liệu Mẫu (Demo Seeding)

Khi đăng ký tài khoản mới, bạn có thể bấm nút **"Tạo dữ liệu mẫu F&B"** ngay trên màn hình Dashboard (`/dashboard`) để nạp nhanh danh mục mẫu (Cà phê, Trà, Nước ngọt, Đồ ăn, Topping), các sản phẩm kèm giá bán và 6 bàn F&B nhằm trải nghiệm bán hàng ngay lập tức!
