const Photo = require('../models/Photo');
const path = require('path');
const fs = require('fs');

// @desc    Upload photo
// @route   POST /api/photos/upload
const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        
        const isProfilePicture = req.body.is_profile_picture === 'true';
        const imagePath = '/uploads/photos/' + req.file.filename;
        
        const photoId = await Photo.uploadPhoto(req.userId, imagePath, isProfilePicture);
        
        res.json({
            success: true,
            message: 'Photo uploaded successfully. Pending approval.',
            data: {
                photoId,
                imagePath
            }
        });
    } catch (error) {
        console.error(error);
        // Delete uploaded file if error occurs
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'uploads/photos', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get user photos
// @route   GET /api/photos/my-photos
const getMyPhotos = async (req, res) => {
    try {
        const photos = await Photo.getUserPhotos(req.userId);
        
        res.json({
            success: true,
            data: photos
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Delete photo
// @route   DELETE /api/photos/:photoId
const deletePhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const deleted = await Photo.deletePhoto(photoId, req.userId);
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Photo deleted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to delete photo or photo not found'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Set profile picture
// @route   PUT /api/photos/set-profile/:photoId
const setProfilePicture = async (req, res) => {
    try {
        const { photoId } = req.params;
        const updated = await Photo.setProfilePicture(photoId, req.userId);
        
        if (updated) {
            res.json({
                success: true,
                message: 'Profile picture updated successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to set profile picture'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    uploadPhoto,
    getMyPhotos,
    deletePhoto,
    setProfilePicture
};