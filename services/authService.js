const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/db');
const jwt = require('jsonwebtoken');

class AuthService {
    async login(loginData) {
        const { mobileNumber, email, password } = loginData;
        const identifier = mobileNumber || email;
        
        console.log('Login attempt for:', identifier);
        
        if (!identifier || !password) {
            throw new Error('Please provide email/mobile number and password');
        }
        
        // Determine if identifier is mobile or email
        let query = '';
        let params = [];
        
        if (identifier.length === 10 && /^\d+$/.test(identifier)) {
            // Mobile number login
            query = `SELECT * FROM users WHERE mobile_number = ? OR phone = ?`;
            params = [identifier, identifier];
        } else {
            // Email login
            query = `SELECT * FROM users WHERE email = ? OR user_email = ?`;
            params = [identifier, identifier];
        }
        
        const [rows] = await promisePool.execute(query, params);
        
        if (rows.length === 0) {
            throw new Error('Invalid mobile number or password');
        }
        
        const user = rows[0];
        
        // Check password (supports both plain text and hashed)
        let isPasswordValid = false;
        
        if (user.user_pass && user.user_pass.startsWith('$2')) {
            // BCRYPT hashed password
            isPasswordValid = await bcrypt.compare(password, user.user_pass);
        } else {
            // Plain text password (temporary)
            isPasswordValid = (password === user.user_pass);
            
            // Auto-migrate to hashed password
            if (isPasswordValid) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await promisePool.execute(
                    'UPDATE users SET user_pass = ? WHERE user_id = ?',
                    [hashedPassword, user.user_id]
                );
                console.log(`Migrated user ${user.user_id} to hashed password`);
            }
        }
        
        if (!isPasswordValid) {
            throw new Error('Invalid mobile number or password');
        }
        
        // Check if user is active
        if (user.user_status === 0 || user.status === 0) {
            throw new Error('Your account has been deactivated');
        }
        
        // Update last login
        await promisePool.execute(
            'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE user_id = ?',
            [user.user_id]
        );
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role || 'user' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
        
        // Remove sensitive data
        delete user.user_pass;
        delete user.password;
        delete user.reset_token_hash;
        delete user.reset_token_expires_at;
        
        return {
            success: true,
            message: 'Login successful',
            token,
            user
        };
    }
    
    async register(userData) {
        const { mobileNumber, email, password, name, gender, dateOfBirth } = userData;
        
        // Check if user exists
        const [existing] = await promisePool.execute(
            'SELECT user_id FROM users WHERE mobile_number = ? OR email = ?',
            [mobileNumber, email]
        );
        
        if (existing.length > 0) {
            throw new Error('User already exists with this mobile number or email');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user
        const [result] = await promisePool.execute(
            `INSERT INTO users (mobile_number, email, user_pass, user_name, gender, dob, user_status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
            [mobileNumber, email, hashedPassword, name, gender, dateOfBirth]
        );
        
        // Generate token
        const token = jwt.sign(
            { userId: result.insertId, email, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
        
        return {
            success: true,
            message: 'Registration successful',
            token,
            user: {
                user_id: result.insertId,
                mobile_number: mobileNumber,
                email,
                user_name: name,
                gender,
                dob: dateOfBirth
            }
        };
    }
}

module.exports = new AuthService();