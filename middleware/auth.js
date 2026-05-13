const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        console.log('=== AUTH MIDDLEWARE START ===');
        
        // হেডার থেকে টোকেন নিন
        let token = req.header('Authorization') || req.header('authorization');
        
        if (!token) {
            console.log('❌ No authorization header found');
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        // 'Bearer ' প্রিফিক্স রিমুভ করুন
        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length);
        }
        
        console.log('✅ Token extracted, length:', token.length);

        // JWT_SECRET চেক করুন
        if (!process.env.JWT_SECRET) {
            console.error('❌ JWT_SECRET is not defined!');
            return res.status(500).json({ 
                success: false, 
                message: 'Server configuration error' 
            });
        }

        // টোকেন ভেরিফাই করুন
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('✅ Token verified successfully');
            console.log('Decoded userId:', decoded.userId);
        } catch (jwtError) {
            console.error('❌ JWT Verification failed:', jwtError.name, jwtError.message);
            
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid token. Please login again.'
                });
            }
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token expired. Please login again.'
                });
            }
            throw jwtError;
        }

        // ইউজার খুঁজুন
        const userId = decoded.userId || decoded.user_id || decoded.id;
        console.log('Looking for user with ID:', userId);
        
        const user = await User.findById(userId);
        
        if (!user) {
            console.log('❌ User not found for id:', userId);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token. User not found.' 
            });
        }
        
        console.log('✅ User found:', user.user_name, '(ID:', user.user_id, ')');
        
        // ইউজার স্ট্যাটাস চেক করুন
        if (user.user_status !== 1) {
            console.log('⚠️ User account deactivated');
            return res.status(403).json({ 
                success: false, 
                message: 'Your account has been deactivated.' 
            });
        }

        // রিকোয়েস্টে ইউজার তথ্য যোগ করুন
        req.user = user;
        req.userId = userId;
        
        console.log('=== AUTH MIDDLEWARE END: SUCCESS ===');
        next();
        
    } catch (error) {
        console.error('💥 Auth middleware unexpected error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Authentication error.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = authMiddleware;