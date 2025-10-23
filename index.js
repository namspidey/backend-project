// index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./db'); // Hàm connect MongoDB
const socketHandler = require('./sockets/socket'); // Xử lý realtime

const app = express();
const server = http.createServer(app);

// Kết nối MongoDB
connectDB();

// Middleware
app.use(express.json());

// ===== CORS =====
const allowedOrigins = [
  'http://localhost:3000', // dev local
  'https://frontend-project-zeta-three.vercel.app' // frontend Vercel
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // Postman, curl
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'CORS policy does not allow access from this Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// ===== Routes =====
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/post', require('./routes/postRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/comment', require('./routes/commentRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/notification', require('./routes/notificationRoutes'));

// ===== Health Check =====
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// ===== Socket.IO =====
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET','POST'],
    credentials: true
  }
});

// Gắn global io
global.io = io;

// Xử lý các sự kiện realtime
socketHandler(io);

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

module.exports = app;
