const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mYFRQUddrXZ4Uv',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_test_secret_key'
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
            key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mYFRQUddrXZ4Uv'
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
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'your_test_secret_key')
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
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

module.exports = router;