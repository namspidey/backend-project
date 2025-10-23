const jwt = require('jsonwebtoken');
const User = require('../models/User');

const connectedUsers = new Map();

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 Socket connected');

    // Nhận token từ client
    socket.on('setup', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        socket.join(userId); // userId là tên room
        connectedUsers.set(userId, socket.id);
        console.log(`✅ User ${userId} joined room`);
      } catch (err) {
        console.error('❌ Token không hợp lệ', err.message);
      }
    });

    socket.on('newMessage', ({ receiverId, message }) => {
      io.to(receiverId).emit('messageReceived', message);
    });

    socket.on('notifyUser', ({ receiverId, notification }) => {
      io.to(receiverId).emit('notification', notification);
    });

    socket.on('disconnect', () => {
      for (let [uid, sid] of connectedUsers.entries()) {
        if (sid === socket.id) connectedUsers.delete(uid);
      }
      console.log('🔌 Socket disconnected');
    });
  });
};

module.exports = socketHandler;
