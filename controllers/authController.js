// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//const { transporter } = require('../utils/email');
const { redis } = require('../utils/redis');
const { sendEmail } = require("../utils/email");
// Đăng ký trực tiếp (dùng cho dev, không dùng OTP)
exports.registerraw = async (req, res) => {
  try {
    const { username, fullname, email, password, dob } = req.body;
    if (!username || !fullname || !email || !password || !dob) {
      return res.status(400).json({ message: "Điền đầy đủ thông tin" });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) return res.status(400).json({ message: "Username/email đã tồn tại" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      fullname,
      email,
      password: hashedPassword,
      dob: new Date(dob),
      profilePic: "https://res.cloudinary.com/dvd8bn89o/image/upload/v1748266570/default-avatar_jv4my5.jpg"
    });

    await newUser.save();
    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (err) {
    console.error("registerraw error:", err);
    res.status(500).json({ message: "Lỗi máy chủ", error: err.message });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Điền đầy đủ thông tin" });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Không tìm thấy user" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Lỗi máy chủ", error: err.message });
  }
};

// Lấy thông tin người dùng hiện tại
exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ message: "Lỗi máy chủ", error: err.message });
  }
};

// Gửi OTP
exports.sendOtp = async (req, res) => {
  try {
    const { username, fullname, email, password, dob } = req.body;
    if (!username || !fullname || !email || !password || !dob) {
      return res.status(400).json({ message: "Điền đầy đủ thông tin" });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) return res.status(400).json({ message: "Username/email đã tồn tại" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redis.set(
      `otp:${email}`,
      JSON.stringify({ otp, username, fullname, password, dob }),
      { EX: 300 } // 5 phút
    );

    await sendEmail({
      to: email,
      subject: "Mã OTP xác thực",
      html: `<p>Mã OTP của bạn là: <b>${otp}</b></p>`,
    });

    res.status(200).json({ message: "Đã gửi OTP đến email" });
  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ message: "Lỗi máy chủ", error: err.message });
  }
};

// Xác minh OTP và đăng ký
exports.register = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Thiếu email hoặc OTP" });

    const rawData = await redis.get(`otp:${email}`);
    if (!rawData) return res.status(400).json({ message: "OTP không đúng hoặc đã hết hạn" });

    const data = JSON.parse(rawData);
    const { otp: savedOtp, username, fullname, password, dob } = data;

    if (otp !== savedOtp) return res.status(400).json({ message: "OTP không đúng hoặc đã hết hạn" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      fullname,
      email,
      password: hashedPassword,
      profilePic: "https://res.cloudinary.com/dvd8bn89o/image/upload/v1748266570/default-avatar_jv4my5.jpg",
      dob: new Date(dob),
    });

    await newUser.save();
    await redis.del(`otp:${email}`);

    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Lỗi máy chủ", error: err.message });
  }
};
