const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuthMiddleware, superAdminOnly } = require('../middleware/adminAuth');

// Public admin login
router.post('/login', adminController.adminLogin);

// Protected admin routes
router.use(adminAuthMiddleware);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.delete('/users/:userId', adminController.deleteUserByAdmin);

// Photo management
router.get('/photos/pending', adminController.getPendingPhotos);
router.put('/photos/:photoId/approve', adminController.approvePhoto);
router.put('/photos/:photoId/reject', adminController.rejectPhoto);

// Admin management (super admin only)
router.get('/admins', superAdminOnly, adminController.getAllAdmins);
router.post('/admins', superAdminOnly, adminController.createAdmin);
router.put('/admins/:adminId', superAdminOnly, adminController.updateAdmin);
router.delete('/admins/:adminId', superAdminOnly, adminController.deleteAdmin);

module.exports = router;