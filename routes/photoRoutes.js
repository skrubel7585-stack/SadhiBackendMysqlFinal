const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// All photo routes require authentication
router.use(authMiddleware);

router.post('/upload', upload.single('photo'), photoController.uploadPhoto);
router.get('/my-photos', photoController.getMyPhotos);
router.delete('/:photoId', photoController.deletePhoto);
router.put('/set-profile/:photoId', photoController.setProfilePicture);

module.exports = router;