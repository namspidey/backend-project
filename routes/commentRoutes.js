const express = require('express');
const router = express.Router();
const {
  createComment,
  deleteComment,
  likeComment,
  unlikeComment
} = require('../controllers/commentController');

router.post('/:postId', createComment);
router.delete('/:commentId', deleteComment);
router.post('/:commentId/like', likeComment);
router.post('/:commentId/unlike', unlikeComment);

module.exports = router;
