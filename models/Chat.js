const { promisePool } = require('../config/database');

class Chat {
    // Send message
    static async sendMessage(senderId, receiverId, message, profileImage = null) {
        try {
            const query = `
                INSERT INTO chat_tble (chat_senderID, chat_receiverID, chat_message, chat_profile_image, interest_status)
                VALUES (?, ?, ?, ?, 9)
            `;
            const [result] = await promisePool.execute(query, [senderId, receiverId, message, profileImage]);
            return result.insertId;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Send interest
    static async sendInterest(senderId, receiverId, message) {
        try {
            const query = `
                INSERT INTO chat_tble (chat_senderID, chat_receiverID, chat_message, interest_status)
                VALUES (?, ?, ?, 0)
            `;
            const [result] = await promisePool.execute(query, [senderId, receiverId, message]);
            return result.insertId;
        } catch (error) {
            console.error('Error sending interest:', error);
            throw error;
        }
    }

    // Update interest status
    static async updateInterestStatus(chatId, status, userId) {
        try {
            const query = `
                UPDATE chat_tble 
                SET interest_status = ? 
                WHERE chat_id = ? AND chat_receiverID = ?
            `;
            const [result] = await promisePool.execute(query, [status, chatId, userId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating interest status:', error);
            throw error;
        }
    }

    // Get conversation between two users
    static async getConversation(userId1, userId2, limit = 50, offset = 0) {
        try {
            const query = `
                SELECT c.*, 
                       u1.user_name as sender_name,
                       u1.user_img as sender_img,
                       u2.user_name as receiver_name,
                       u2.user_img as receiver_img
                FROM chat_tble c
                LEFT JOIN tbl_user u1 ON c.chat_senderID = u1.user_id
                LEFT JOIN tbl_user u2 ON c.chat_receiverID = u2.user_id
                WHERE (c.chat_senderID = ? AND c.chat_receiverID = ?)
                   OR (c.chat_senderID = ? AND c.chat_receiverID = ?)
                AND c.deleted_by_sender = 0 AND c.deleted_by_receiver = 0
                ORDER BY c.chat_date DESC
                LIMIT ? OFFSET ?
            `;
            const [rows] = await promisePool.execute(query, [userId1, userId2, userId2, userId1, parseInt(limit), parseInt(offset)]);
            return rows.reverse();
        } catch (error) {
            console.error('Error getting conversation:', error);
            throw error;
        }
    }

    // Get all chats for a user
    static async getUserChats(userId, page = 1, limit = 20) {
        try {
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            const query = `
                SELECT 
                    CASE 
                        WHEN c.chat_senderID = ? THEN c.chat_receiverID
                        ELSE c.chat_senderID
                    END as other_user_id,
                    MAX(c.chat_date) as last_message_time,
                    u.user_name as other_user_name,
                    u.user_img as other_user_img,
                    u.user_img as other_user_profile_photo,
                    (
                        SELECT chat_message FROM chat_tble 
                        WHERE ((chat_senderID = ? AND chat_receiverID = u.user_id) 
                            OR (chat_senderID = u.user_id AND chat_receiverID = ?))
                            AND deleted_by_sender = 0 AND deleted_by_receiver = 0
                        ORDER BY chat_date DESC LIMIT 1
                    ) as last_message,
                    (
                        SELECT interest_status FROM chat_tble 
                        WHERE ((chat_senderID = ? AND chat_receiverID = u.user_id) 
                            OR (chat_senderID = u.user_id AND chat_receiverID = ?))
                            AND deleted_by_sender = 0 AND deleted_by_receiver = 0
                        ORDER BY chat_date DESC LIMIT 1
                    ) as interest_status,
                    (
                        SELECT COUNT(*) FROM chat_tble 
                        WHERE chat_receiverID = ? AND chat_senderID = u.user_id 
                        AND is_read = 0 AND deleted_by_sender = 0 AND deleted_by_receiver = 0
                    ) as unread_count
                FROM chat_tble c
                JOIN tbl_user u ON (
                    CASE 
                        WHEN c.chat_senderID = ? THEN c.chat_receiverID
                        ELSE c.chat_senderID
                    END
                ) = u.user_id
                WHERE (c.chat_senderID = ? OR c.chat_receiverID = ?)
                AND c.deleted_by_sender = 0 AND c.deleted_by_receiver = 0
                GROUP BY other_user_id
                ORDER BY last_message_time DESC
                LIMIT ? OFFSET ?
            `;
            
            const [rows] = await promisePool.execute(query, [
                userId,                    // for CASE
                userId, userId,           // for last_message subquery
                userId, userId,           // for interest_status subquery
                userId,                   // for unread_count
                userId,                   // for JOIN condition
                userId, userId,           // for WHERE clause
                parseInt(limit), offset   // for LIMIT
            ]);
            
            // Get total count
            const countQuery = `
                SELECT COUNT(DISTINCT 
                    CASE 
                        WHEN chat_senderID = ? THEN chat_receiverID
                        ELSE chat_senderID
                    END
                ) as total
                FROM chat_tble
                WHERE (chat_senderID = ? OR chat_receiverID = ?)
                AND deleted_by_sender = 0 AND deleted_by_receiver = 0
            `;
            const [countResult] = await promisePool.execute(countQuery, [userId, userId, userId]);
            
            return {
                chats: rows,
                total: countResult[0].total,
                page: parseInt(page),
                totalPages: Math.ceil(countResult[0].total / parseInt(limit))
            };
        } catch (error) {
            console.error('Error getting user chats:', error);
            throw error;
        }
    }

    // Mark messages as read
    static async markAsRead(receiverId, senderId) {
        try {
            const query = `
                UPDATE chat_tble 
                SET is_read = 1, read_at = NOW()
                WHERE chat_receiverID = ? AND chat_senderID = ? AND is_read = 0
            `;
            const [result] = await promisePool.execute(query, [receiverId, senderId]);
            return result.affectedRows;
        } catch (error) {
            console.error('Error marking as read:', error);
            throw error;
        }
    }

    // Delete chat for user
    static async deleteChat(userId, otherUserId) {
        try {
            const query = `
                UPDATE chat_tble 
                SET 
                    deleted_by_sender = CASE WHEN chat_senderID = ? THEN 1 ELSE deleted_by_sender END,
                    deleted_by_receiver = CASE WHEN chat_receiverID = ? THEN 1 ELSE deleted_by_receiver END
                WHERE (chat_senderID = ? AND chat_receiverID = ?)
                   OR (chat_senderID = ? AND chat_receiverID = ?)
            `;
            const [result] = await promisePool.execute(query, [userId, userId, userId, otherUserId, otherUserId, userId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting chat:', error);
            throw error;
        }
    }

    // Get pending interests
    static async getPendingInterests(userId, page = 1, limit = 20) {
        try {
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            const query = `
                SELECT c.*, u.user_name, u.user_img,
                       u.user_img as profile_photo
                FROM chat_tble c
                JOIN tbl_user u ON c.chat_senderID = u.user_id
                WHERE c.chat_receiverID = ? AND c.interest_status = 0
                AND c.deleted_by_sender = 0 AND c.deleted_by_receiver = 0
                ORDER BY c.chat_date DESC
                LIMIT ? OFFSET ?
            `;
            
            const [rows] = await promisePool.execute(query, [userId, parseInt(limit), offset]);
            
            const countQuery = `
                SELECT COUNT(*) as total
                FROM chat_tble
                WHERE chat_receiverID = ? AND interest_status = 0
                AND deleted_by_sender = 0 AND deleted_by_receiver = 0
            `;
            const [countResult] = await promisePool.execute(countQuery, [userId]);
            
            return {
                interests: rows,
                total: countResult[0].total,
                page: parseInt(page),
                totalPages: Math.ceil(countResult[0].total / parseInt(limit))
            };
        } catch (error) {
            console.error('Error getting pending interests:', error);
            throw error;
        }
    }
}

module.exports = Chat;