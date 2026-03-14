const express = require("express");
const cors = require("cors");
require('dotenv').config(); // Load biến môi trường từ .env
const userRoutes = require("./routes/userRoutes");
const questionRoutes = require("./routes/questionRoutes");
const quizRoutes = require("./routes/quizRoutes");
const miscRoutes = require("./routes/miscRoutes");
const adminRoutes = require("./routes/adminRoutes");
const topicRoutes = require("./routes/topicRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const examRoutes = require("./routes/examRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json()); // Để server hiểu được dữ liệu JSON gửi lên

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api", miscRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/exam", examRoutes);

app.get("/", (req,res)=>{
    res.send("AQG Backend Running");
});

const server = app.listen(3000,()=>{
    console.log("Server running on port 3000...");
});

// Tăng socket/server timeout lên 5 phút (300000 ms) để API AI chạy đủ backoff time khi sinh 100 câu hỏi
server.timeout = 300000;