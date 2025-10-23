const express = require('express');
const router = express.Router();
const {getUserById, followUser, 
    unfollowUser,
    getFollowing,
    countFollowing,
    searchUsers,
    getFollowers,
    countFollowers,
    uploadProfilePic,
    getUserProfile,
updateUserProfile,
 changePassword} = require('../controllers/userController');
const { uploadAvatar } = require('../middleware/upload');

router.get('/search', searchUsers);
router.get('/:id', getUserById);

router.post('/:id/follow', followUser);
router.post('/:id/unfollow', unfollowUser);
router.get('/:id/following', getFollowing);
router.get('/:id/following/count', countFollowing);
router.get('/:id/followers', getFollowers);
router.get('/:id/followers/count', countFollowers);
router.post('/upload-avatar', uploadAvatar.single('image'), uploadProfilePic);
router.get('/profile/:username', getUserProfile);
router.put('/update',  updateUserProfile);
router.put('/change-password',  changePassword);

module.exports = router;
