const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);

// Bike garage routes
router.post('/bikes', authenticateToken, authController.addBike);
router.put('/bikes/:bikeId', authenticateToken, authController.updateBike);
router.delete('/bikes/:bikeId', authenticateToken, authController.removeBike);
router.put('/bikes/:bikeId/activate', authenticateToken, authController.setActiveBike);

module.exports = router;
