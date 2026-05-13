const { promisePool } = require('../config/database');
const path = require('path');
const fs = require('fs');

class Photo {
    // Upload photo
    static async uploadPhoto(userId, imagePath, isProfilePicture = false) {
        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();
            
            // If setting as profile picture, remove other profile pictures
            if (isProfilePicture) {
                await connection.execute(
                    'UPDATE user_photo SET is_profile_picture = 0 WHERE user_id = ?',
                    [userId]
                );
            }
            
            // Insert new photo
            const query = `
                INSERT INTO user_photo (user_id, image_path, is_profile_picture, approval_status)
                VALUES (?, ?, ?, 0)
            `;
            const [result] = await connection.execute(query, [userId, imagePath, isProfilePicture ? 1 : 0]);
            
            // Update user's profile image if setting as profile picture
            if (isProfilePicture) {
                await connection.execute(
                    'UPDATE tbl_user SET user_img = ? WHERE user_id = ?',
                    [imagePath, userId]
                );
            }
            
            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get user photos
    static async getUserPhotos(userId, status = null) {
        let query = 'SELECT * FROM user_photo WHERE user_id = ?';
        const values = [userId];
        
        if (status !== null) {
            query += ' AND approval_status = ?';
            values.push(status);
        }
        
        query += ' ORDER BY is_profile_picture DESC, upload_date DESC';
        
        const [rows] = await promisePool.execute(query, values);
        return rows;
    }

    // Get pending photos for admin
    static async getPendingPhotos(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        
        const query = `
            SELECT p.*, u.user_name, u.user_email, u.user_phone, u.user_gen_id
            FROM user_photo p
            JOIN tbl_user u ON p.user_id = u.user_id
            WHERE p.approval_status = 0
            ORDER BY p.upload_date ASC
            LIMIT ? OFFSET ?
        `;
        
        const [rows] = await promisePool.execute(query, [limit, offset]);
        
        const countQuery = 'SELECT COUNT(*) as total FROM user_photo WHERE approval_status = 0';
        const [countResult] = await promisePool.execute(countQuery);
        
        return {
            photos: rows,
            total: countResult[0].total,
            page,
            totalPages: Math.ceil(countResult[0].total / limit)
        };
    }

    // Approve photo
    static async approvePhoto(photoId, adminId) {
        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Get photo details
            const [photo] = await connection.execute(
                'SELECT * FROM user_photo WHERE photo_id = ?',
                [photoId]
            );
            
            if (!photo[0]) {
                throw new Error('Photo not found');
            }
            
            // Update photo status
            await connection.execute(
                'UPDATE user_photo SET approval_status = 1, approved_by = ?, approved_date = NOW() WHERE photo_id = ?',
                [adminId, photoId]
            );
            
            // If this is a profile picture, update user's main image
            if (photo[0].is_profile_picture) {
                await connection.execute(
                    'UPDATE tbl_user SET user_img = ? WHERE user_id = ?',
                    [photo[0].image_path, photo[0].user_id]
                );
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Reject photo
    static async rejectPhoto(photoId, adminId, reason = null) {
        const query = `
            UPDATE user_photo 
            SET approval_status = 2, approved_by = ?, approved_date = NOW(), rejection_reason = ?
            WHERE photo_id = ?
        `;
        const [result] = await promisePool.execute(query, [adminId, reason, photoId]);
        return result.affectedRows > 0;
    }

    // Delete photo
    static async deletePhoto(photoId, userId = null) {
        let query = 'SELECT * FROM user_photo WHERE photo_id = ?';
        const values = [photoId];
        
        if (userId) {
            query += ' AND user_id = ?';
            values.push(userId);
        }
        
        const [photo] = await promisePool.execute(query, values);
        
        if (!photo[0]) {
            return false;
        }
        
        // Delete file from server
        const filePath = path.join(__dirname, '..', photo[0].image_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Delete from database
        const deleteQuery = 'DELETE FROM user_photo WHERE photo_id = ?';
        const [result] = await promisePool.execute(deleteQuery, [photoId]);
        
        // If this was profile picture, set a new profile picture if available
        if (photo[0].is_profile_picture && result.affectedRows > 0) {
            const [newProfile] = await promisePool.execute(
                'SELECT image_path FROM user_photo WHERE user_id = ? AND approval_status = 1 LIMIT 1',
                [photo[0].user_id]
            );
            
            if (newProfile[0]) {
                await promisePool.execute(
                    'UPDATE tbl_user SET user_img = ? WHERE user_id = ?',
                    [newProfile[0].image_path, photo[0].user_id]
                );
                
                await promisePool.execute(
                    'UPDATE user_photo SET is_profile_picture = 1 WHERE photo_id = ?',
                    [newProfile[0].photo_id]
                );
            } else {
                await promisePool.execute(
                    'UPDATE tbl_user SET user_img = NULL WHERE user_id = ?',
                    [photo[0].user_id]
                );
            }
        }
        
        return result.affectedRows > 0;
    }

    // Set profile picture
    static async setProfilePicture(photoId, userId) {
        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Verify photo belongs to user
            const [photo] = await connection.execute(
                'SELECT * FROM user_photo WHERE photo_id = ? AND user_id = ? AND approval_status = 1',
                [photoId, userId]
            );
            
            if (!photo[0]) {
                throw new Error('Invalid photo');
            }
            
            // Remove other profile pictures
            await connection.execute(
                'UPDATE user_photo SET is_profile_picture = 0 WHERE user_id = ?',
                [userId]
            );
            
            // Set new profile picture
            await connection.execute(
                'UPDATE user_photo SET is_profile_picture = 1 WHERE photo_id = ?',
                [photoId]
            );
            
            // Update user table
            await connection.execute(
                'UPDATE tbl_user SET user_img = ? WHERE user_id = ?',
                [photo[0].image_path, userId]
            );
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Photo;