const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const postStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'insta_clone_posts',
    resource_type: 'image',
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1080, height: 1080, crop: 'limit' }],
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'insta_clone_avatars',
    resource_type: 'image',
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

const messageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'insta_clone_messages',
    resource_type: 'image',
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

module.exports = {
  cloudinary,
  postStorage,
  avatarStorage,
  messageStorage,
};
