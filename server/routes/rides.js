const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ridesController = require('../controllers/ridesController');

// All rides routes are protected
router.use(authenticateToken);

// Create a new ride
router.post('/', ridesController.createRide);

// Get a single ride
router.get('/:rideId', ridesController.getRide);

// Get user's rides (with pagination and filtering)
router.get('/', ridesController.getUserRides);

// Get rides by date range
router.get('/history/range', ridesController.getRidesByDateRange);

// Compare rides
router.post('/compare', ridesController.compareRides);

// Update a ride
router.put('/:rideId', ridesController.updateRide);

module.exports = router;
