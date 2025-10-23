const Comment = require('../models/Comment');
const Post = require('../models/Post');
const jwt = require('jsonwebtoken');

// Lấy userId từ token
function getUserIdFromToken(req) {
  const token = req.headers.authorization?.split(' ')[1];
  return jwt.verify(token, process.env.JWT_SECRET).id;
}

// Tạo bình luận mới
exports.createComment = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { postId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Nội dung bình luận không được để trống' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    const comment = new Comment({ user: userId, post: postId, content });
    await comment.save();

    // Thêm comment ID vào mảng comments của bài post
    post.comments.push(comment._id);
    await post.save();

    res.status(201).json({ message: 'Đã thêm bình luận', comment });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Xoá bình luận
exports.deleteComment = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });

    if (comment.user.toString() !== userId) {
      return res.status(403).json({ message: 'Không có quyền xoá bình luận này' });
    }

    await Comment.findByIdAndDelete(commentId);
    // Xoá ID khỏi Post.comments
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: commentId } });

    res.status(200).json({ message: 'Đã xoá bình luận' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Like bình luận
exports.likeComment = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { commentId } = req.params;

    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { $addToSet: { likes: userId } }, // chỉ thêm nếu chưa có
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }

    res.status(200).json({ message: 'Đã like bình luận', comment });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};


// Unlike bình luận
exports.unlikeComment = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { commentId } = req.params;

    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { $pull: { likes: userId } },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }

    res.status(200).json({ message: 'Đã unlike bình luận', comment });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

