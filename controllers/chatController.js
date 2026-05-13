const { promisePool } = require('../config/database');
const Chat = require('../models/Chat');

// @desc    Send message
// @route   POST /api/chats/send
const sendMessage = async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        
        if (!receiverId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID and message are required'
            });
        }
        
        const chatId = await Chat.sendMessage(req.userId, receiverId, message);
        
        // Get the sent message
        const [sentMessage] = await promisePool.execute(
            `SELECT c.*, u1.user_name as sender_name, u2.user_name as receiver_name
             FROM chat_tble c
             LEFT JOIN tbl_user u1 ON c.chat_senderID = u1.user_id
             LEFT JOIN tbl_user u2 ON c.chat_receiverID = u2.user_id
             WHERE c.chat_id = ?`,
            [chatId]
        );
        
        const formattedMessage = {
            _id: sentMessage[0]?.chat_id,
            message: sentMessage[0]?.chat_message,
            sender: {
                _id: sentMessage[0]?.chat_senderID,
                name: sentMessage[0]?.sender_name
            },
            receiver: {
                _id: sentMessage[0]?.chat_receiverID,
                name: sentMessage[0]?.receiver_name
            },
            createdAt: sentMessage[0]?.chat_date,
            isRead: false
        };
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            data: formattedMessage
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Send interest
// @route   POST /api/chats/send-interest
const sendInterest = async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        
        if (!receiverId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID and message are required'
            });
        }
        
        const chatId = await Chat.sendInterest(req.userId, receiverId, message);
        
        res.json({
            success: true,
            message: 'Interest sent successfully',
            data: { chatId }
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

// @desc    Accept interest
// @route   PUT /api/chats/accept-interest/:chatId
const acceptInterest = async (req, res) => {
    try {
        const { chatId } = req.params;
        const updated = await Chat.updateInterestStatus(chatId, 1, req.userId);
        
        if (updated) {
            res.json({
                success: true,
                message: 'Interest accepted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to accept interest'
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

// @desc    Deny interest
// @route   PUT /api/chats/deny-interest/:chatId
const denyInterest = async (req, res) => {
    try {
        const { chatId } = req.params;
        const updated = await Chat.updateInterestStatus(chatId, 2, req.userId);
        
        if (updated) {
            res.json({
                success: true,
                message: 'Interest denied'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to deny interest'
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

// @desc    Get conversation
// @route   GET /api/chats/conversation/:userId
const getConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const messages = await Chat.getConversation(req.userId, userId, parseInt(limit), parseInt(offset));
        
        // Mark messages as read
        await Chat.markAsRead(req.userId, userId);
        
        res.json({
            success: true,
            data: messages
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

// @desc    Get all chats
// @route   GET /api/chats/my-chats
const getMyChats = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const chats = await Chat.getUserChats(req.userId, parseInt(page), parseInt(limit));
        
        res.json({
            success: true,
            data: chats
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

// @desc    Get pending interests
// @route   GET /api/chats/pending-interests
const getPendingInterests = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const interests = await Chat.getPendingInterests(req.userId, parseInt(page), parseInt(limit));
        
        res.json({
            success: true,
            data: interests
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

// @desc    Delete chat
// @route   DELETE /api/chats/:userId
const deleteChat = async (req, res) => {
    try {
        const { userId } = req.params;
        const deleted = await Chat.deleteChat(req.userId, userId);
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Chat deleted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to delete chat'
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

// @desc    Get chat list for frontend (simplified)
// @route   GET /api/chats/list
const getChatList = async (req, res) => {
    try {
        const result = await Chat.getUserChats(req.userId, 1, 50);
        
        // Format for frontend
        const formattedChats = (result.chats || []).map(chat => ({
            _id: chat.other_user_id,
            name: chat.other_user_name,
            profilePicture: chat.other_user_profile_photo || chat.other_user_img,
            lastMessage: chat.last_message || 'Start a conversation',
            lastMessageTime: chat.last_message_time,
            unreadCount: chat.unread_count || 0,
            isOnline: false,
            interestStatus: chat.interest_status
        }));
        
        res.json({
            success: true,
            chats: formattedChats
        });
    } catch (error) {
        console.error('Get chat list error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get messages with specific user
// @route   GET /api/chats/messages/:userId
const getMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        
        const messages = await Chat.getConversation(req.userId, userId, parseInt(limit), parseInt(offset));
        
        // Format for frontend
        const formattedMessages = messages.map(msg => ({
            _id: msg.chat_id,
            message: msg.chat_message,
            sender: {
                _id: msg.chat_senderID,
                name: msg.sender_name
            },
            receiver: {
                _id: msg.chat_receiverID,
                name: msg.receiver_name
            },
            createdAt: msg.chat_date,
            isRead: msg.is_read === 1,
            profileImage: msg.chat_profile_image
        }));
        
        res.json({
            success: true,
            messages: formattedMessages
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Mark messages as read
// @route   PUT /api/chats/mark-read/:userId
const markMessagesAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        
        await Chat.markAsRead(req.userId, userId);
        
        res.json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    sendMessage,
    sendInterest,
    acceptInterest,
    denyInterest,
    getConversation,
    getMyChats,
    getPendingInterests,
    deleteChat,
    getChatList,
    getMessages,
    markMessagesAsRead
};