const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
    // Find admin by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM admin_tble WHERE ad_email = ?';
        const [rows] = await promisePool.execute(query, [email]);
        return rows[0];
    }

    // Find admin by ID
    static async findById(adminId) {
        const query = 'SELECT ad_id, ad_name, ad_phone, ad_email, ad_img, ad_status, ad_create_date, role FROM admin_tble WHERE ad_id = ?';
        const [rows] = await promisePool.execute(query, [adminId]);
        return rows[0];
    }

    // Update last login
    static async updateLastLogin(adminId) {
        const query = 'UPDATE admin_tble SET last_login = NOW() WHERE ad_id = ?';
        const [result] = await promisePool.execute(query, [adminId]);
        return result.affectedRows > 0;
    }

    // Get all admins
    static async getAllAdmins(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        
        const query = 'SELECT ad_id, ad_name, ad_phone, ad_email, ad_img, ad_status, ad_create_date, last_login, role FROM admin_tble LIMIT ? OFFSET ?';
        const [rows] = await promisePool.execute(query, [limit, offset]);
        
        const countQuery = 'SELECT COUNT(*) as total FROM admin_tble';
        const [countResult] = await promisePool.execute(countQuery);
        
        return {
            admins: rows,
            total: countResult[0].total,
            page,
            totalPages: Math.ceil(countResult[0].total / limit)
        };
    }

    // Create new admin
    static async create(adminData) {
        const { ad_name, ad_phone, ad_email, ad_pass, role = 'admin' } = adminData;
        const hashedPassword = await bcrypt.hash(ad_pass, 10);
        
        const query = `
            INSERT INTO admin_tble (ad_name, ad_phone, ad_email, ad_pass, role)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await promisePool.execute(query, [ad_name, ad_phone, ad_email, hashedPassword, role]);
        return result.insertId;
    }

    // Update admin
    static async update(adminId, updateData) {
        const allowedFields = ['ad_name', 'ad_phone', 'ad_email', 'ad_img', 'ad_status', 'role'];
        const updates = [];
        const values = [];
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }
        
        if (updateData.ad_pass) {
            const hashedPassword = await bcrypt.hash(updateData.ad_pass, 10);
            updates.push('ad_pass = ?');
            values.push(hashedPassword);
        }
        
        if (updates.length === 0) return false;
        
        values.push(adminId);
        const query = `UPDATE admin_tble SET ${updates.join(', ')} WHERE ad_id = ?`;
        const [result] = await promisePool.execute(query, values);
        return result.affectedRows > 0;
    }

    // Delete admin
    static async delete(adminId) {
        const query = 'DELETE FROM admin_tble WHERE ad_id = ? AND role != "super_admin"';
        const [result] = await promisePool.execute(query, [adminId]);
        return result.affectedRows > 0;
    }

    // Get dashboard stats
    static async getDashboardStats() {
        const queries = {
            totalUsers: 'SELECT COUNT(*) as count FROM tbl_user WHERE user_status = 1',
            totalMale: 'SELECT COUNT(*) as count FROM tbl_user WHERE user_gender = "male" AND user_status = 1',
            totalFemale: 'SELECT COUNT(*) as count FROM tbl_user WHERE user_gender = "female" AND user_status = 1',
            newUsersToday: 'SELECT COUNT(*) as count FROM tbl_user WHERE DATE(user_create_date) = CURDATE()',
            newUsersWeek: 'SELECT COUNT(*) as count FROM tbl_user WHERE WEEK(user_create_date) = WEEK(CURDATE())',
            pendingPhotos: 'SELECT COUNT(*) as count FROM user_photo WHERE approval_status = 0',
            totalChats: 'SELECT COUNT(*) as count FROM chat_tble',
            pendingInterests: 'SELECT COUNT(*) as count FROM chat_tble WHERE interest_status = 0',
            activeUsers: 'SELECT COUNT(*) as count FROM tbl_user WHERE last_login > DATE_SUB(NOW(), INTERVAL 7 DAY)',
            premiumUsers: 'SELECT COUNT(*) as count FROM tbl_user WHERE plan_type IS NOT NULL AND plan_expiry_date > NOW()',
            totalAdmins: 'SELECT COUNT(*) as count FROM admin_tble'
        };
        
        const stats = {};
        for (const [key, query] of Object.entries(queries)) {
            const [rows] = await promisePool.execute(query);
            stats[key] = rows[0].count;
        }
        
        // Get recent users
        const [recentUsers] = await promisePool.execute(
            'SELECT user_id, user_name, user_email, user_phone, user_gender, user_create_date FROM tbl_user ORDER BY user_create_date DESC LIMIT 10'
        );
        stats.recentUsers = recentUsers;
        
        // Get recent chats
        const [recentChats] = await promisePool.execute(
            `SELECT c.*, u1.user_name as sender_name, u2.user_name as receiver_name 
             FROM chat_tble c
             JOIN tbl_user u1 ON c.chat_senderID = u1.user_id
             JOIN tbl_user u2 ON c.chat_receiverID = u2.user_id
             ORDER BY c.chat_date DESC LIMIT 10`
        );
        stats.recentChats = recentChats;
        
        return stats;
    }
}

module.exports = Admin;