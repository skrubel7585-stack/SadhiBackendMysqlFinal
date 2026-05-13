const Admin = require('../models/Admin');
const User = require('../models/User');
const Photo = require('../models/Photo');
const Chat = require('../models/Chat');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token for Admin
const generateAdminToken = (adminId) => {
    return jwt.sign({ adminId }, process.env.ADMIN_JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @desc    Admin login
// @route   POST /api/admin/login
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }
        
        const admin = await Admin.findByEmail(email);
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        const isPasswordValid = await bcrypt.compare(password, admin.ad_pass);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        if (admin.ad_status !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }
        
        await Admin.updateLastLogin(admin.ad_id);
        const token = generateAdminToken(admin.ad_id);
        
        delete admin.ad_pass;
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                admin,
                token
            }
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

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
const getDashboardStats = async (req, res) => {
    try {
        const stats = await Admin.getDashboardStats();
        
        res.json({
            success: true,
            data: stats
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

// @desc    Get all users
// @route   GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        
        let query = `
            SELECT u.*, 
                   (SELECT COUNT(*) FROM user_photo WHERE user_id = u.user_id) as photos_count,
                   (SELECT COUNT(*) FROM chat_tble WHERE chat_senderID = u.user_id OR chat_receiverID = u.user_id) as chats_count
            FROM tbl_user u
            WHERE 1=1
        `;
        const values = [];
        
        if (search) {
            query += ' AND (u.user_name LIKE ? OR u.user_email LIKE ? OR u.user_phone LIKE ?)';
            values.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (status) {
            query += ' AND u.user_status = ?';
            values.push(status);
        }
        
        const offset = (page - 1) * limit;
        query += ' ORDER BY u.user_id DESC LIMIT ? OFFSET ?';
        values.push(parseInt(limit), offset);
        
        const [users] = await promisePool.execute(query, values);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM tbl_user WHERE 1=1';
        const countValues = [];
        if (search) {
            countQuery += ' AND (user_name LIKE ? OR user_email LIKE ? OR user_phone LIKE ?)';
            countValues.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status) {
            countQuery += ' AND user_status = ?';
            countValues.push(status);
        }
        
        const [countResult] = await promisePool.execute(countQuery, countValues);
        
        // Remove sensitive data
        users.forEach(user => {
            delete user.user_pass;
            delete user.reset_token_hash;
        });
        
        res.json({
            success: true,
            data: {
                users,
                total: countResult[0].total,
                page: parseInt(page),
                totalPages: Math.ceil(countResult[0].total / limit)
            }
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

// @desc    Get user details
// @route   GET /api/admin/users/:userId
const getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const photos = await Photo.getUserPhotos(userId);
        const chats = await Chat.getUserChats(userId, 1, 10);
        
        delete user.user_pass;
        
        res.json({
            success: true,
            data: {
                user,
                photos,
                recentChats: chats.chats
            }
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

// @desc    Update user status
// @route   PUT /api/admin/users/:userId/status
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        
        const updated = await User.updateStatus(userId, status);
        
        if (updated) {
            res.json({
                success: true,
                message: `User ${status === 1 ? 'activated' : 'deactivated'} successfully`
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to update user status'
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

// @desc    Delete user (admin)
// @route   DELETE /api/admin/users/:userId
const deleteUserByAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Delete user photos from storage
        const userPhotos = await Photo.getUserPhotos(userId);
        const fs = require('fs');
        const path = require('path');
        
        for (const photo of userPhotos) {
            const filePath = path.join(__dirname, '..', photo.image_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        const deleted = await User.delete(userId);
        
        if (deleted) {
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to delete user'
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

// @desc    Get pending photos
// @route   GET /api/admin/photos/pending
const getPendingPhotos = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const photos = await Photo.getPendingPhotos(parseInt(page), parseInt(limit));
        
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

// @desc    Approve photo
// @route   PUT /api/admin/photos/:photoId/approve
const approvePhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const approved = await Photo.approvePhoto(photoId, req.adminId);
        
        if (approved) {
            res.json({
                success: true,
                message: 'Photo approved successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to approve photo'
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

// @desc    Reject photo
// @route   PUT /api/admin/photos/:photoId/reject
const rejectPhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const { reason } = req.body;
        const rejected = await Photo.rejectPhoto(photoId, req.adminId, reason);
        
        if (rejected) {
            // Delete the rejected photo file
            const [photo] = await promisePool.execute('SELECT image_path FROM user_photo WHERE photo_id = ?', [photoId]);
            if (photo[0]) {
                const filePath = path.join(__dirname, '..', photo[0].image_path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            
            res.json({
                success: true,
                message: 'Photo rejected and deleted'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to reject photo'
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

// @desc    Get all admins
// @route   GET /api/admin/admins
const getAllAdmins = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const admins = await Admin.getAllAdmins(parseInt(page), parseInt(limit));
        
        res.json({
            success: true,
            data: admins
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

// @desc    Create admin
// @route   POST /api/admin/admins
const createAdmin = async (req, res) => {
    try {
        const { ad_name, ad_phone, ad_email, ad_pass, role } = req.body;
        
        const existingAdmin = await Admin.findByEmail(ad_email);
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin with this email already exists'
            });
        }
        
        const adminId = await Admin.create({ ad_name, ad_phone, ad_email, ad_pass, role });
        
        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: { adminId }
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

// @desc    Update admin
// @route   PUT /api/admin/admins/:adminId
const updateAdmin = async (req, res) => {
    try {
        const { adminId } = req.params;
        
        // Prevent self-demotion if super admin
        if (adminId == req.adminId && req.body.role && req.body.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'You cannot change your own role'
            });
        }
        
        const updated = await Admin.update(adminId, req.body);
        
        if (updated) {
            res.json({
                success: true,
                message: 'Admin updated successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to update admin'
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

// @desc    Delete admin
// @route   DELETE /api/admin/admins/:adminId
const deleteAdmin = async (req, res) => {
    try {
        const { adminId } = req.params;
        
        if (adminId == req.adminId) {
            return res.status(403).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }
        
        const deleted = await Admin.delete(adminId);
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Admin deleted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to delete admin or cannot delete super admin'
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
    adminLogin,
    getDashboardStats,
    getAllUsers,
    getUserDetails,
    updateUserStatus,
    deleteUserByAdmin,
    getPendingPhotos,
    approvePhoto,
    rejectPhoto,
    getAllAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin
};