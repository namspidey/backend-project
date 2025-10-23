const express = require('express');
const connectDB = require('./db');
require('dotenv').config();
const cors = require('cors');
const http = require('http'); // ✅ Thêm
const { Server } = require('socket.io'); // ✅ Thêm
const socketHandler = require('./sockets/socket'); // ✅ Thêm - tạo file này ở bước sau

const app = express();
const server = http.createServer(app); // ✅ Tạo server từ app

connectDB();

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/post', require('./routes/postRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/comment', require('./routes/commentRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/notification', require('./routes/notificationRoutes'));


// ✅ Khởi tạo Socket.IO server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// ✅ Gắn io vào global để sử dụng trong controller
global.io = io;

// ✅ Xử lý các sự kiện realtime (setup, message, notification)
socketHandler(io); // sẽ tạo ở bước tiếp theo

// ✅ Chạy server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

module.exports = app;
