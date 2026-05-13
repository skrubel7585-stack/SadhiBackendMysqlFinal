const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        const admin = await Admin.findById(decoded.adminId);
        
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token. Admin not found.' 
            });
        }
        
        if (admin.ad_status !== 1) {
            return res.status(403).json({ 
                success: false, 
                message: 'Your admin account has been deactivated.' 
            });
        }

        req.admin = admin;
        req.adminId = decoded.adminId;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token.' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired.' 
            });
        }
        res.status(500).json({ 
            success: false, 
            message: 'Authentication error.' 
        });
    }
};

// Super admin only middleware
const superAdminOnly = (req, res, next) => {
    if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied. Super admin only.' 
        });
    }
    next();
};

module.exports = { adminAuthMiddleware, superAdminOnly };