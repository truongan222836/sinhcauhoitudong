# sinhcauhoitudong

# 🎓 ĐỀ TÀI

## **Hệ thống sinh câu hỏi tự động (AQG – Automatic Question Generation)**

---

# 🧠 1. TỔNG QUAN HỆ THỐNG

Hệ thống cho phép:

1. Người dùng đăng ký / đăng nhập
2. Upload tài liệu học tập
3. AI sinh câu hỏi từ nội dung
4. Tạo bài kiểm tra
5. Làm bài online
6. Chấm điểm tự động
7. Xem thống kê kết quả

---

# 🧱 2. KIẾN TRÚC HỆ THỐNG

Mô hình:

```
Frontend (React)
        ↓ API
Backend (NodeJS + Express)
        ↓
Database (SQL Server)
```


---

# 🗄️ 3. DATABASE (12 BẢNG)


## Nhóm bảng người dùng

* ROLES
* USERS

---

## Nhóm học liệu

* SUBJECTS
* DOCUMENTS
* PARAGRAPHS

---

## Nhóm AQG

* QUESTION_TYPES
* QUESTIONS
* ANSWERS

---

## Nhóm kiểm tra

* QUIZZES
* QUIZ_QUESTIONS
* ATTEMPTS
* USER_ANSWERS

---


---

# ⚙️ 4. BACKEND

Công nghệ:

👉 Node.js
👉 Express.js

---

## Backend chịu trách nhiệm

### 🔐 Authentication

* đăng ký
* đăng nhập
* JWT token
* phân quyền

---

### 📄 Document Module

* upload file
* lưu database
* tách đoạn văn

---

### 🧠 AQG Module (quan trọng nhất)

```
Upload tài liệu
→ Tách paragraph
→ Sinh câu hỏi
→ Lưu QUESTIONS + ANSWERS
```

---

### 📝 Quiz Module

* tạo bài kiểm tra
* thêm câu hỏi
* làm bài
* nộp bài
* chấm điểm

---

### 📊 Statistics

* lịch sử làm bài
* điểm số

---

## Cấu trúc backend chuẩn

```
backend/
│
├── config/
├── models/
├── controllers/
├── routes/
├── middleware/
├── services/
└── server.js
```

---

# 🎨 5. FRONTEND
---

## Các trang cần có

### 1️⃣ Login / Register

---

### 2️⃣ Dashboard

* danh sách môn
* quiz
* tài liệu

---

### 3️⃣ Upload tài liệu

---

### 4️⃣ Sinh câu hỏi AI

---

### 5️⃣ Làm bài thi

---


### 6️⃣ Xem kết quả

---

Frontend chỉ làm:

```
Gửi request → Backend API
Hiển thị dữ liệu
```

---

# 🔄 6. LUỒNG HOẠT ĐỘNG HỆ THỐNG

```
User → Frontend
        ↓
API Request
        ↓
Backend xử lý
        ↓
SQL Server
        ↓
Sinh câu hỏi
        ↓
Trả dữ liệu về giao diện


