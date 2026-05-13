const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

// All chat routes require authentication
router.use(authMiddleware);

// Existing routes
router.post('/send', chatController.sendMessage);
router.post('/send-interest', chatController.sendInterest);
router.put('/accept-interest/:chatId', chatController.acceptInterest);
router.put('/deny-interest/:chatId', chatController.denyInterest);
router.get('/conversation/:userId', chatController.getConversation);
router.get('/my-chats', chatController.getMyChats);
router.get('/pending-interests', chatController.getPendingInterests);
router.delete('/:userId', chatController.deleteChat);

// NEW ROUTES for frontend compatibility
router.get('/list', chatController.getChatList);  // برای ChatListScreen
router.get('/messages/:userId', chatController.getMessages);  // برای ChatDetailScreen
router.put('/mark-read/:userId', chatController.markMessagesAsRead);  // জন্য mark read

module.exports = router;