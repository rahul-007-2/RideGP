const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const communityController = require('../controllers/communityController');

// All community routes are protected
router.use(authenticateToken);

// Get community stats for a route
router.get('/route-stats', communityController.getRouteCommunityStats);

// Get all routes for current user
router.get('/routes', communityController.getUserRoutes);

// Get commute insights
router.get('/insights/commute', communityController.getCommuteInsights);

// Get smart insights
router.get('/insights/smart', communityController.getSmartInsights);

// Get or generate monthly wrapped
router.get('/wrapped', communityController.getMonthlyWrapped);

// Community posts
router.get('/posts', communityController.getPosts);
router.post('/posts', communityController.createPost);

module.exports = router;
