const express = require('express');
const router = express.Router();
const {
  getUserPosts,
  getPostDetail,
  getFeedPosts,
  createPost,
  deletePost,
  likePost,
  unlikePost
  
} = require('../controllers/postController');
const { uploadPost } = require('../middleware/upload');

router.get('/feed', getFeedPosts);
router.get('/user/:id', getUserPosts);
router.get('/:id', getPostDetail);
router.post('/', uploadPost.array('images', 10), createPost);
router.delete('/:id', deletePost);
router.post('/:postId/like', likePost);
router.post('/:postId/unlike', unlikePost);



module.exports = router;
