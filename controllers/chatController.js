const Message = require('../models/Message');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { cloudinary } = require('../utils/cloudinary');

function getUserIdFromToken(req) {
  const token = req.headers.authorization?.split(' ')[1];
  return jwt.verify(token, process.env.JWT_SECRET).id;
}

// Gửi tin nhắn (văn bản hoặc ảnh)
exports.sendMessage = async (req, res) => {
  try {
    const senderId = getUserIdFromToken(req);
    const { receiverId, content } = req.body;
    const file = req.file;

    let imageUrl = null;
    if (file) imageUrl = file.path;

    if (!content && !imageUrl) {
      return res.status(400).json({ message: "Phải có nội dung hoặc ảnh" });
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      image: imageUrl,
    });

    await newMessage.save();

    const populatedMessage = await newMessage.populate("sender", "username avatar");

    // Gửi realtime đến người nhận
    global.io.to(receiverId).emit("messageReceived", populatedMessage);

    // Trả về tin nhắn đầy đủ cho người gửi
    res.status(201).json({ message: "Đã gửi tin nhắn", data: populatedMessage });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// (Tùy chọn) Lấy tin nhắn giữa 2 người
exports.getMessages = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { otherUserId } = req.params;

    // Phân trang
    const page = parseInt(req.query.page) || 1;       // trang hiện tại (mặc định 1)
    const limit = parseInt(req.query.limit) || 10;    // số tin nhắn mỗi trang
    const skip = (page - 1) * limit;

    // Tìm tất cả tin nhắn giữa 2 người, sort theo thời gian (mới nhất -> cũ nhất)
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
      .sort({ createdAt: -1 })  // mới nhất trước
      .skip(skip)
      .limit(limit);

    // Đếm tổng số tin nhắn giữa 2 user
    const totalMessages = await Message.countDocuments({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    });

    const hasMore = page * limit < totalMessages;

    res.status(200).json({
      messages,
      currentPage: page,
      totalMessages,
      hasMore
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};


//Seen
exports.markMessagesAsSeen = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.id;
    const otherUserId = req.params.otherUserId;

    const result = await Message.updateMany(
      {
        sender: otherUserId,
        receiver: currentUserId,
        seen: false
      },
      { $set: { seen: true } }
    );

    res.status(200).json({
      message: 'Đã đánh dấu tin nhắn là đã xem',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Lỗi mark seen:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

//chat list
exports.getChatList = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Lấy tất cả tin nhắn liên quan đến user (gửi hoặc nhận)
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ createdAt: -1 });

    const chatMap = new Map(); // Key: userId (người đối thoại), Value: message mới nhất

    for (const msg of messages) {
      const otherUserId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
      if (!chatMap.has(otherUserId)) {
        chatMap.set(otherUserId, msg); // Lưu tin nhắn mới nhất giữa 2 người
      }
    }

    const chatList = [];

    for (const [otherUserId, latestMsg] of chatMap.entries()) {
      const otherUser = await User.findById(otherUserId).select('_id username fullname profilePic');

      chatList.push({
        user: {
          id: otherUser._id,
          username: otherUser.username,
          fullname: otherUser.fullname,
          profilePic: otherUser.profilePic
        },
        latestMessage: {
          content: latestMsg.content || '',
          sender: latestMsg.sender,
          createdAt: latestMsg.createdAt
        },
        seen: latestMsg.sender.toString() !== userId ? latestMsg.seen : true
      });
    }
    chatList.sort((a, b) => new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt));
    res.status(200).json(chatList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};