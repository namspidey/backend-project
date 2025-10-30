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

    // 1️⃣ Kiểm tra đầy đủ thông tin
    if (!username || !fullname || !email || !password || !dob) {
      return res.status(400).json({ message: "Điền đầy đủ thông tin" });
    }

    // 2️⃣ Không được chứa dấu cách trong các trường chính
    const hasSpace = /\s/;
    if (hasSpace.test(username) || hasSpace.test(email) || hasSpace.test(password)) {
      return res.status(400).json({ message: "Không được chứa dấu cách trong username, email hoặc password" });
    }

    // 3️⃣ Username: chỉ cho phép chữ cái, số, gạch dưới (_), không dấu tiếng Việt
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: "Username chỉ được chứa chữ, số và dấu gạch dưới (không dấu, không ký tự đặc biệt)" });
    }

    // 4️⃣ Email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    // 5️⃣ Ngày sinh phải là quá khứ
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime()) || dobDate >= new Date()) {
      return res.status(400).json({ message: "Ngày sinh phải là trong quá khứ" });
    }

    // 6️⃣ Kiểm tra username/email đã tồn tại
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username hoặc email đã tồn tại" });
    }

    // 7️⃣ Hash password và lưu
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      fullname,
      email,
      password: hashedPassword,
      dob: dobDate,
      profilePic: "https://res.cloudinary.com/dvd8bn89o/image/upload/v1748266570/default-avatar_jv4my5.jpg",
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

    // 1️⃣ Kiểm tra đầy đủ thông tin
    if (!username || !fullname || !email || !password || !dob) {
      return res.status(400).json({ message: "Điền đầy đủ thông tin" });
    }

    // 2️⃣ Không được chứa dấu cách trong các trường chính
    const hasSpace = /\s/;
    if (hasSpace.test(username) || hasSpace.test(email) || hasSpace.test(password)) {
      return res
        .status(400)
        .json({ message: "Không được chứa dấu cách trong username, email hoặc password" });
    }

    // 3️⃣ Username: chỉ cho phép chữ cái, số, gạch dưới (_), không dấu tiếng Việt
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res
        .status(400)
        .json({
          message: "Username chỉ được chứa chữ, số và dấu gạch dưới (không dấu, không ký tự đặc biệt)"
        });
    }

    // 4️⃣ Email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    // 5️⃣ Ngày sinh phải là quá khứ
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime()) || dobDate >= new Date()) {
      return res.status(400).json({ message: "Ngày sinh phải là trong quá khứ" });
    }

    // 6️⃣ Kiểm tra username/email đã tồn tại
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username hoặc email đã tồn tại" });
    }

    // 7️⃣ Tạo và lưu OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redis.set(
      `otp:${email}`,
      JSON.stringify({ otp, username, fullname, password, dob }),
      { ex: 300 } // ⏰ 5 phút
    );

    // 8️⃣ Gửi email
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

    const data = await redis.get(`otp:${email}`);

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
