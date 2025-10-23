const multer = require('multer');
const { postStorage, avatarStorage, messageStorage } = require('../utils/cloudinary');

const uploadPost = multer({ storage: postStorage });
const uploadAvatar = multer({ storage: avatarStorage });
const uploadMessageImage = multer({ storage: messageStorage }); 

module.exports = {
  uploadPost,
  uploadAvatar,
  uploadMessageImage
};
