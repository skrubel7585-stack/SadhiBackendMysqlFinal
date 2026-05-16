const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { promisePool } = require('../config/database');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_Sq2UAea55vLHvb',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'IYrDZtKR6MhnIfPmp5FfBCnC'
});

// ============ PAYMENT ROUTES ============
router.post('/payments/create-order', async (req, res) => {
    try {
        const { amount = 99, currency = 'INR' } = req.body;
        
        const options = {
            amount: amount * 100,
            currency: currency,
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1,
            notes: {
                purpose: 'Matrimony Registration Fee'
            }
        };

        const order = await razorpay.orders.create(options);
        
        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID || 'rzp_live_Sq2UAea55vLHvb'
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        });
    }
});

router.post('/payments/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'gpXL09IvRR8ScOHNt3YU3EGx')
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Update payment status if user is logged in
            if (req.userId) {
                await promisePool.execute(
                    `UPDATE tbl_user SET 
                    user_payment_status = 'completed', 
                    plan_type = 'premium',
                    plan_expiry_date = DATE_ADD(NOW(), INTERVAL 1 YEAR),
                    payment_id = ?,
                    payment_amount = ?,
                    payment_date = NOW()
                    WHERE user_id = ?`,
                    [razorpay_payment_id, 99, req.userId]
                );
            }
            
            res.json({
                success: true,
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
});

// ============ USER AUTH ROUTES ============
// Public routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Protected routes
router.get('/profile', authMiddleware, userController.getUserProfile);
router.put('/profile', authMiddleware, userController.updateUserProfile);
router.put('/change-password', authMiddleware, userController.changePassword);
router.get('/search', authMiddleware, userController.searchUsers);
router.delete('/account', authMiddleware, userController.deleteAccount);

// Auth routes for dashboard
router.get('/me', authMiddleware, userController.getCurrentUser);
router.get('/matches', authMiddleware, userController.getMatches);
router.get('/activities', authMiddleware, userController.getActivities);
router.get('/stats', authMiddleware, userController.getUserStats);
router.post('/send-interest', authMiddleware, userController.sendInterest);

// Shortlist routes
router.get('/shortlist', authMiddleware, userController.getShortlist);
router.post('/shortlist', authMiddleware, userController.addToShortlist);
router.post('/remove-shortlist', authMiddleware, userController.removeFromShortlist);

// ============ PROFILE BY ID ROUTE (SQL Version) ============
router.get('/profile/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        console.log("🔍 Fetching profile for user ID:", userId);
        
        const query = `SELECT * FROM tbl_user WHERE user_id = ?`;
        const [rows] = await promisePool.execute(query, [userId]);
        
        if (rows.length === 0) {
            console.log("❌ User not found:", userId);
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const user = rows[0];
        delete user.user_pass;
        
        console.log("✅ User found:", user.user_name);
        
        // Format response for frontend
        res.json({ 
            success: true, 
            user: {
                _id: user.user_id,
                id: user.user_id,
                name: user.user_name,
                email: user.user_email,
                phone: user.user_phone,
                age: user.user_dob ? calculateAge(user.user_dob) : null,
                gender: user.user_gender,
                city: user.user_city || 'Not specified',
                state: user.user_state || 'Not specified',
                country: user.user_country || 'India',
                religion: user.user_religion || 'Not specified',
                motherTongue: user.user_mother_tongue || 'Not specified',
                maritalStatus: user.user_maritalstatus || 'Not specified',
                occupation: user.user_jobType || 'Not specified',
                education: user.user_degree || 'Not specified',
                about: user.about || user.user_address || 'No description provided',
                profilePicture: user.user_img || null,
                isPremium: user.plan_type === 'premium',
                isOnline: user.is_online || false
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ============ CHECK INTEREST ROUTE (SQL Version) ============
router.get('/check-interest/:id', authMiddleware, async (req, res) => {
    try {
        const toUserId = req.params.id;
        const fromUserId = req.userId;
        
        console.log("🔍 Checking interest - From:", fromUserId, "To:", toUserId);
        
        // Create interests table if not exists
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS interests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                from_user_id INT NOT NULL,
                to_user_id INT NOT NULL,
                status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_interest (from_user_id, to_user_id),
                INDEX idx_from_user (from_user_id),
                INDEX idx_to_user (to_user_id),
                INDEX idx_status (status)
            )
        `;
        
        await promisePool.execute(createTableQuery);
        
        // Check if interest exists
        const query = `
            SELECT id FROM interests 
            WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'
        `;
        
        const [rows] = await promisePool.execute(query, [fromUserId, toUserId]);
        
        console.log("Interest exists:", rows.length > 0);
        
        res.json({ 
            success: true,
            isInterested: rows.length > 0 
        });
    } catch (error) {
        console.error('Error checking interest:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ============ SEND INTEREST ROUTE (SQL Version) ============
router.post('/send-interest', authMiddleware, async (req, res) => {
    try {
        const { toUserId } = req.body;
        const fromUserId = req.userId;
        
        console.log("💌 Sending interest - From:", fromUserId, "To:", toUserId);
        
        // Check if interest already exists
        const checkQuery = `
            SELECT id FROM interests 
            WHERE from_user_id = ? AND to_user_id = ?
        `;
        
        const [existing] = await promisePool.execute(checkQuery, [fromUserId, toUserId]);
        
        if (existing.length > 0) {
            console.log("⚠️ Interest already sent");
            return res.status(400).json({ 
                success: false, 
                message: 'Interest already sent' 
            });
        }
        
        // Insert new interest
        const insertQuery = `
            INSERT INTO interests (from_user_id, to_user_id, status, created_at) 
            VALUES (?, ?, 'pending', NOW())
        `;
        
        await promisePool.execute(insertQuery, [fromUserId, toUserId]);
        
        console.log("✅ Interest sent successfully");
        
        res.json({ 
            success: true, 
            message: 'Interest sent successfully' 
        });
    } catch (error) {
        console.error('Error sending interest:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ============ GET SHORTLIST (SQL Version) ============
router.get('/shortlist', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        const query = `
            SELECT u.user_id, u.user_name, u.user_city, u.user_state, 
                   u.user_jobType, u.user_img, u.plan_type,
                   s.created_at as shortlisted_at
            FROM shortlist s
            JOIN tbl_user u ON s.target_user_id = u.user_id
            WHERE s.user_id = ? AND u.user_status = 1
            ORDER BY s.created_at DESC
        `;
        
        const [rows] = await promisePool.execute(query, [userId]);
        
        res.json({
            success: true,
            shortlist: rows
        });
    } catch (error) {
        console.error('Error fetching shortlist:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============ ADD TO SHORTLIST (SQL Version) ============
router.post('/shortlist', authMiddleware, async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const userId = req.userId;
        
        // Create shortlist table if not exists
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS shortlist (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                target_user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_shortlist (user_id, target_user_id),
                INDEX idx_user (user_id),
                INDEX idx_target (target_user_id)
            )
        `;
        
        await promisePool.execute(createTableQuery);
        
        // Check if already in shortlist
        const [existing] = await promisePool.execute(
            'SELECT id FROM shortlist WHERE user_id = ? AND target_user_id = ?',
            [userId, targetUserId]
        );
        
        let isShortlisted = false;
        
        if (existing.length > 0) {
            // Remove from shortlist
            await promisePool.execute(
                'DELETE FROM shortlist WHERE user_id = ? AND target_user_id = ?',
                [userId, targetUserId]
            );
            isShortlisted = false;
        } else {
            // Add to shortlist
            await promisePool.execute(
                'INSERT INTO shortlist (user_id, target_user_id, created_at) VALUES (?, ?, NOW())',
                [userId, targetUserId]
            );
            isShortlisted = true;
        }
        
        res.json({
            success: true,
            message: isShortlisted ? 'Added to shortlist' : 'Removed from shortlist',
            isShortlisted: isShortlisted
        });
    } catch (error) {
        console.error('Error toggling shortlist:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============ REMOVE FROM SHORTLIST (SQL Version) ============
router.post('/remove-shortlist', authMiddleware, async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const userId = req.userId;
        
        await promisePool.execute(
            'DELETE FROM shortlist WHERE user_id = ? AND target_user_id = ?',
            [userId, targetUserId]
        );
        
        res.json({
            success: true,
            message: 'Removed from shortlist'
        });
    } catch (error) {
        console.error('Error removing from shortlist:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Helper function to calculate age
function calculateAge(dob) {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

module.exports = router;