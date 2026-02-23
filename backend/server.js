const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const questionRoutes = require("./routes/questionRoutes");

const app = express();

app.use(cors());
app.use(express.json()); // Để server hiểu được dữ liệu JSON gửi lên

app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);

app.get("/", (req,res)=>{
    res.send("AQG Backend Running");
});

app.listen(3000,()=>{
    console.log("Server running on port 3000...");
});