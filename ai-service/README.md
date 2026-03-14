# Hướng dẫn tích hợp AI cho chức năng sinh câu hỏi

## Tổng quan
Hệ thống đã được tích hợp với OpenAI API để tự động sinh câu hỏi từ văn bản đầu vào.

## Thiết lập API Key

1. Truy cập [OpenAI Platform](https://platform.openai.com/api-keys)
2. Tạo API key mới
3. Mở file `backend/.env`
4. Thay thế `your-openai-api-key-here` bằng API key thực tế của bạn

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

## Các loại câu hỏi được hỗ trợ

### 1. Trắc nghiệm (Multiple Choice)
- Sinh câu hỏi có 4 lựa chọn A, B, C, D
- Chỉ định đáp án đúng
- Phù hợp cho kiểm tra kiến thức cơ bản

### 2. Tự luận (Essay)
- Sinh câu hỏi mở
- Có thể bao gồm gợi ý trả lời
- Khuyến khích suy nghĩ sâu sắc

### 3. Điền khuyết (Fill-in-the-Blank)
- Tạo câu văn có chỗ trống
- Cung cấp danh sách từ khóa để điền
- Tập trung vào từ vựng và khái niệm quan trọng

## Cách sử dụng

1. **Đăng nhập** với tài khoản giảng viên
2. **Truy cập trang "Sinh câu hỏi"**
3. **Nhập văn bản** cần sinh câu hỏi
4. **Chọn loại câu hỏi** và số lượng
5. **Nhấn "Sinh câu hỏi"**
6. **Xem kết quả** và lưu thành đề thi nếu muốn

## Lưu ý kỹ thuật

- Số lượng câu hỏi tối đa: 20 câu/lần
- Độ dài văn bản đầu vào: không giới hạn nhưng nên dưới 4000 ký tự
- Model AI sử dụng: GPT-3.5-turbo
- Ngôn ngữ: Tiếng Việt

## Xử lý lỗi

Nếu gặp lỗi "Invalid API key":
- Kiểm tra lại API key trong file .env
- Đảm bảo API key còn hạn và có đủ credit

Nếu gặp lỗi "Rate limit exceeded":
- Chờ một thời gian trước khi thử lại
- Hoặc nâng cấp gói OpenAI

## Phát triển thêm

Để mở rộng chức năng:
- Thêm model AI khác (GPT-4, Claude, etc.)
- Tùy chỉnh prompt cho từng loại câu hỏi
- Thêm tính năng đánh giá độ khó của câu hỏi
- Hỗ trợ đa ngôn ngữ