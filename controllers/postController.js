const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const jwt = require('jsonwebtoken');
const { cloudinary } = require('../utils/cloudinary');

exports.createPost = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const caption = req.body.caption || '';
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Cần ít nhất một ảnh' });
    }

    const imageUrls = files.map(file => file.path); // Cloudinary trả về .path là URL

    const newPost = new Post({
      user: decoded.id,
      caption,
      images: imageUrls,
    });

    await newPost.save();
    res.status(201).json({ message: 'Đăng bài thành công', post: newPost });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    if (post.user.toString() !== decoded.id) {
      return res.status(403).json({ message: 'Không có quyền xóa bài viết này' });
    }

    // Xóa ảnh từ Cloudinary
    for (const imageUrl of post.images) {
      const publicId = getPublicIdFromUrl(imageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(`insta_clone_posts/${publicId}`);
      }
    }

    // 🔥 Xóa toàn bộ comment của bài viết này
    await Comment.deleteMany({ post: post._id });

    // Xóa bài viết
    await post.deleteOne();

    res.status(200).json({ message: 'Đã xóa bài viết, ảnh trên Cloudinary và các bình luận' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Hàm lấy publicId từ URL
function getPublicIdFromUrl(url) {
  try {
    const parts = url.split('/');
    const filenameWithExt = parts[parts.length - 1]; // vd: abc123.jpg
    return filenameWithExt.replace(/\.[^/.]+$/, ''); // → abc123
  } catch {
    return null;
  }
}

exports.likePost = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
      await post.save();
    }

    res.status(200).json({ message: 'Đã like bài viết', likeCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    post.likes = post.likes.filter(id => id.toString() !== userId);
    await post.save();

    res.status(200).json({ message: 'Đã unlike bài viết', likeCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getFeedPosts = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const skip = parseInt(req.query.skip) || 0;
    const limit = 5;

    // Lấy danh sách người đang theo dõi + chính mình
    const user = await User.findById(userId);
    const followingIds = user.following.map(id => id.toString());
    followingIds.push(userId); // Bao gồm cả bài của mình

    // Lấy post
    const posts = await Post.find({ user: { $in: followingIds } })
      .sort({ createdAt: -1 }) // Mới nhất trước
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profilePic') // Lấy thêm thông tin user
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'username profilePic' }
      });

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getPostDetail = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId)
      .populate('user', 'username profilePic') // Lấy user của bài post
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username profilePic' // Lấy người cmt
        }
      });

    if (!post) {
      return res.status(404).json({ message: 'Post không tồn tại' });
    }

    res.status(200).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { id } = req.params; // ID của user cần xem bài viết
    const skip = parseInt(req.query.skip) || 0;
    const limit = 6;

    // Kiểm tra người dùng tồn tại
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    // Lấy bài viết của user (mới nhất trước), phân trang
    const posts = await Post.find({ user: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profilePic')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'username profilePic' }
      }); // chỉ populate thông tin người đăng

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
