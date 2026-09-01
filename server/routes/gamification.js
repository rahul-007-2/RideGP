const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const gamificationController = require('../controllers/gamificationController');

// All gamification routes are protected
router.use(authenticateToken);

// Check and unlock achievements
router.post('/achievements/check', gamificationController.checkAchievements);

// Get user's achievements
router.get('/achievements', gamificationController.getAchievements);

// Update ride streak
router.post('/streak/update', gamificationController.updateStreak);

// Get user's streak info
router.get('/streak', gamificationController.getStreak);

module.exports = router;
