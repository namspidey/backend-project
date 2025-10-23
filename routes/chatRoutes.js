const express = require('express');
const router = express.Router();
const { sendMessage, getMessages,markMessagesAsSeen,getChatList } = require('../controllers/chatController');
const { uploadMessageImage } = require('../middleware/upload'); // middleware upload 1 ảnh

router.get('/list', getChatList);
router.get('/:otherUserId', getMessages); // Lấy tin nhắn với người khác
router.post('/', uploadMessageImage.single('image'), sendMessage);
router.post('/seen/:otherUserId', markMessagesAsSeen);


module.exports = router;
