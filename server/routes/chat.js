const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.use(authenticateToken);

// Groups
router.post('/groups', chatController.createGroup);
router.get('/groups', chatController.getUserGroups);
router.get('/groups/:groupId', chatController.getGroup);
router.post('/groups/:groupId/members', chatController.addMembers);
router.post('/groups/:groupId/leave', chatController.leaveGroup);

// Messages
router.get('/groups/:groupId/messages', chatController.getMessages);
router.post('/groups/:groupId/messages', chatController.sendMessage);

module.exports = router;
