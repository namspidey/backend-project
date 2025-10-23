const User = require('../models/User');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const { cloudinary } = require('../utils/cloudinary');
const bcrypt = require('bcryptjs');
//Follow
exports.followUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.id;
    const targetUserId = req.params.id;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: "Không thể tự follow chính mình" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({ message: "Bạn đã follow người này rồi" });
    }

    // Cập nhật following/followers
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    // ✅ Tạo thông báo
    const notification = new Notification({
      user: targetUserId,
      message: `${currentUser.fullname} đã theo dõi bạn`,
    });
    await notification.save();

    // ✅ Gửi notification qua Socket.IO nếu user đang online
    const receiverSocketRoom = global.io && global.io.sockets?.adapter?.rooms?.get(targetUserId);
    if (receiverSocketRoom) {
      global.io.to(targetUserId).emit('notification', {
        message: notification.message,
        createdAt: notification.createdAt,
        isRead: false,
      });
    }

    res.status(200).json({ message: "Follow thành công" });
  } catch (err) {
    console.error("❌ Lỗi follow:", err.message);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
//Unfollow
exports.unfollowUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.id;
    const targetUserId = req.params.id;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    if (!currentUser.following.includes(targetUserId)) {
      return res.status(400).json({ message: "Bạn chưa follow người này" });
    }

    currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: "Đã unfollow" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

//Search user
exports.searchUsers = async (req, res) => {
  try {
    const keyword = req.query.q;
    if (!keyword) return res.status(400).json({ message: "Thiếu từ khóa tìm kiếm" });

    const users = await User.find({
      username: { $regex: keyword, $options: 'i' }
    }).select('_id username fullname profilePic');

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

//View followers list of an user
exports.getFollowers = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).populate('followers', '_id username fullname profilePic');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json(user.followers);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

//Count followers of an user
exports.countFollowers = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const count = user.followers.length;
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// View following list of an user
exports.getFollowing = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).populate('following', '_id username fullname profilePic');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    res.status(200).json({
      following: user.following,
      count: user.following.length,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách following:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};


// Count following of an user
exports.countFollowing = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const count = user.following.length;
    res.status(200).json({ followingCount: count });
  } catch (error) {
    console.error("Lỗi khi đếm số lượng following:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

//Upload/Update profilePic
exports.uploadProfilePic = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log('Decoded token:', decoded);
    const userId = decoded.id;
    //console.log('Uploaded file:', req.file);
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'Không tìm thấy ảnh' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: req.file.path },
      { new: true }
    );

    res.status(200).json({
      message: 'Cập nhật ảnh đại diện thành công',
      profilePic: updatedUser.profilePic,
    });
  } catch (err) {
    console.error('Lỗi server:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const username = req.params.username; // 🔹 đổi từ id → username

    // Tìm user theo username, bỏ password
    const user = await User.findOne({ username }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới và xác nhận không khớp' });
    }

    const user = await User.findById(userId);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const updateData = {
      fullname: req.body.fullname,
      bio: req.body.bio,
      dob: req.body.dob,
      profilePic: req.body.profilePic
    };

    // Cập nhật thông tin
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};


exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm user theo ID và loại bỏ password
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error('❌ Lỗi khi lấy user theo ID:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
